import type { MarketDataGenerator, MarketDataGeneratorLoader } from './market-data-generator.model';
import { getErrorMessage } from '../../shared/utils/get-error-message';
import { dispatchMessage, type MessageHandlers } from '../../shared/utils/message-dispatch';
import { isValidProducerSettings } from '../domain/producer-settings.validation';
import type { ProducerSettings } from '../models/producer-settings.model';
import type {
  MainToWorkerMessage,
  MainToWorkerMessageMap,
  WorkerToMainMessage
} from '../models/worker-message.model';

export type MarketDataWorkerRuntimeDependencies = {
  readonly post: (message: WorkerToMainMessage) => void;
  readonly loadGenerator: MarketDataGeneratorLoader;
}

/** Mutable state of the run currently owned by the Worker. A new object is created for every `init` command. */
type RunSession = {
  readonly runId: number;
  readonly settings: ProducerSettings;
  /** `null` until the generator has been loaded and initialized. */
  generator: MarketDataGenerator | null;
  isPaused: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Worker-side producer: owns the active run, schedules batches and reports lifecycle events.
 * Stale async work is discarded by comparing the captured session with the active one.
 */
export class MarketDataWorkerRuntime {
  private run: RunSession | null = null;
  private readonly dependencies: MarketDataWorkerRuntimeDependencies;
  private readonly handlers: MessageHandlers<MainToWorkerMessageMap> = {
    init: async (message) => this.init(message),
    pause: ({ runId }) => this.withActiveRun(runId, (run) => this.pause(run)),
    resume: ({ runId }) => this.withActiveRun(runId, (run) => this.resume(run)),
    dispose: ({ runId }) => this.withActiveRun(runId, () => this.dispose())
  };

  constructor(dependencies: MarketDataWorkerRuntimeDependencies) {
    this.dependencies = dependencies;
  }

  handle(message: MainToWorkerMessage): void {
    dispatchMessage(this.handlers, message.type, message);
  }

  private async init({ runId, settings, seed, wasmUrl }: MainToWorkerMessageMap['init']): Promise<void> {
    this.dispose();

    const run: RunSession = { runId, settings, generator: null, isPaused: false, timer: null };

    this.run = run;

    if (!isValidProducerSettings(settings)) {
      this.fail(run, 'Worker received invalid producer settings.');

      return;
    }

    try {
      const generator = await this.dependencies.loadGenerator(wasmUrl);

      if (!this.isActive(run)) {
        return;
      }

      generator.initialize(seed, settings.instrumentCount);
      run.generator = generator;
      this.post({ type: 'ready', runId });

      if (run.isPaused) {
        this.post({ type: 'paused', runId });
      } else {
        this.scheduleNextBatch(run);
      }
    } catch (error: unknown) {
      if (this.isActive(run)) {
        this.fail(run, getErrorMessage(error, 'Unable to initialize WebAssembly generator.'));
      }
    }
  }

  private pause(run: RunSession): void {
    run.isPaused = true;
    this.clearScheduledBatch(run);

    if (run.generator) {
      this.post({ type: 'paused', runId: run.runId });
    }
  }

  private resume(run: RunSession): void {
    if (!run.isPaused) {
      return;
    }

    run.isPaused = false;

    if (run.generator) {
      this.post({ type: 'resumed', runId: run.runId });
      this.scheduleNextBatch(run);
    }
  }

  private dispose(): void {
    if (this.run) {
      this.clearScheduledBatch(this.run);
      this.run = null;
    }
  }

  private scheduleNextBatch(run: RunSession): void {
    if (!this.canGenerate(run)) {
      return;
    }

    run.timer = setTimeout(() => {
      run.timer = null;
      this.publishBatch(run);
    }, run.settings.batchIntervalMs);
  }

  /** The next batch is scheduled only after the current one has been generated and posted. */
  private publishBatch(run: RunSession): void {
    if (!this.canGenerate(run) || !run.generator) {
      return;
    }

    try {
      const updates = run.generator.generateBatch(run.settings.updatesPerBatch);

      this.post({ type: 'batch', runId: run.runId, updates });
    } catch (error: unknown) {
      this.fail(run, getErrorMessage(error, 'Unknown WebAssembly generation error.'));

      return;
    }

    this.scheduleNextBatch(run);
  }

  private fail(run: RunSession, message: string): void {
    this.clearScheduledBatch(run);
    run.isPaused = true;
    this.post({ type: 'error', runId: run.runId, message });
  }

  private clearScheduledBatch(run: RunSession): void {
    if (run.timer !== null) {
      clearTimeout(run.timer);
      run.timer = null;
    }
  }

  private withActiveRun(runId: number, action: (run: RunSession) => void): void {
    if (this.run?.runId === runId) {
      action(this.run);
    }
  }

  private canGenerate(run: RunSession): boolean {
    return this.isActive(run) && run.generator !== null && !run.isPaused;
  }

  private isActive(run: RunSession): boolean {
    return this.run === run;
  }

  private post(message: WorkerToMainMessage): void {
    this.dependencies.post(message);
  }
}

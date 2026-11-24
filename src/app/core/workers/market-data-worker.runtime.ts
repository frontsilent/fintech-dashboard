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
  readonly postToMainThread: (message: WorkerToMainMessage) => void;
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
    init: async (message) => this.startRun(message),
    pause: ({ runId }) => this.runIfActive(runId, (run) => this.pauseRun(run)),
    resume: ({ runId }) => this.runIfActive(runId, (run) => this.resumeRun(run)),
    dispose: ({ runId }) => this.runIfActive(runId, () => this.disposeActiveRun())
  };

  constructor(dependencies: MarketDataWorkerRuntimeDependencies) {
    this.dependencies = dependencies;
  }

  handleMainThreadMessage(message: MainToWorkerMessage): void {
    dispatchMessage(this.handlers, message.type, message);
  }

  private async startRun({ runId, settings, seed, wasmUrl }: MainToWorkerMessageMap['init']): Promise<void> {
    this.disposeActiveRun();

    const run: RunSession = { runId, settings, generator: null, isPaused: false, timer: null };

    this.run = run;

    if (!isValidProducerSettings(settings)) {
      this.failRun(run, 'Worker received invalid producer settings.');

      return;
    }

    try {
      const generator = await this.dependencies.loadGenerator(wasmUrl);

      if (!this.isActiveRun(run)) {
        return;
      }

      generator.initializeRun(seed, settings.instrumentCount);
      run.generator = generator;
      this.postToMainThread({ type: 'ready', runId });

      if (run.isPaused) {
        this.postToMainThread({ type: 'paused', runId });
      } else {
        this.scheduleNextBatch(run);
      }
    } catch (error: unknown) {
      if (this.isActiveRun(run)) {
        this.failRun(run, getErrorMessage(error, 'Unable to initialize WebAssembly generator.'));
      }
    }
  }

  private pauseRun(run: RunSession): void {
    run.isPaused = true;
    this.clearScheduledBatch(run);

    if (run.generator) {
      this.postToMainThread({ type: 'paused', runId: run.runId });
    }
  }

  private resumeRun(run: RunSession): void {
    if (!run.isPaused) {
      return;
    }

    run.isPaused = false;

    if (run.generator) {
      this.postToMainThread({ type: 'resumed', runId: run.runId });
      this.scheduleNextBatch(run);
    }
  }

  private disposeActiveRun(): void {
    if (this.run) {
      this.clearScheduledBatch(this.run);
      this.run = null;
    }
  }

  private scheduleNextBatch(run: RunSession): void {
    if (!this.canGenerateBatch(run)) {
      return;
    }

    run.timer = setTimeout(() => {
      run.timer = null;
      this.generateAndPostBatch(run);
    }, run.settings.batchIntervalMs);
  }

  /** The next batch is scheduled only after the current one has been generated and posted. */
  private generateAndPostBatch(run: RunSession): void {
    if (!this.canGenerateBatch(run) || !run.generator) {
      return;
    }

    try {
      const updates = run.generator.generateUpdateBatch(run.settings.updatesPerBatch);

      this.postToMainThread({ type: 'batch', runId: run.runId, updates });
    } catch (error: unknown) {
      this.failRun(run, getErrorMessage(error, 'Unknown WebAssembly generation error.'));

      return;
    }

    this.scheduleNextBatch(run);
  }

  private failRun(run: RunSession, message: string): void {
    this.clearScheduledBatch(run);
    run.isPaused = true;
    this.postToMainThread({ type: 'error', runId: run.runId, message });
  }

  private clearScheduledBatch(run: RunSession): void {
    if (run.timer !== null) {
      clearTimeout(run.timer);
      run.timer = null;
    }
  }

  private runIfActive(runId: number, action: (run: RunSession) => void): void {
    if (this.run?.runId === runId) {
      action(this.run);
    }
  }

  private canGenerateBatch(run: RunSession): boolean {
    return this.isActiveRun(run) && run.generator !== null && !run.isPaused;
  }

  private isActiveRun(run: RunSession): boolean {
    return this.run === run;
  }

  private postToMainThread(message: WorkerToMainMessage): void {
    this.dependencies.postToMainThread(message);
  }
}

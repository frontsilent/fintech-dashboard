import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';

import { MarketDataWorkerService } from './market-data-worker.service';
import { createRandomSeed } from '../../shared/utils/create-random-seed';
import { getErrorMessage } from '../../shared/utils/get-error-message';
import { dispatchMessage, type MessageHandlers } from '../../shared/utils/message-dispatch';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer.constants';
import type { InstrumentMetrics, MarketMetricsState } from '../models/market-data.model';
import type { ProducerSettings, ProducerSnapshot } from '../models/producer.model';
import type { WorkerEvent, WorkerEventMap } from '../models/worker-message.model';
import { createInstrumentSymbols } from '../utils/instrument-symbol';
import { applyMarketUpdates, createMarketMetricsState, selectInstrumentMetrics } from '../utils/market-metrics';
import {
  canPauseProducer,
  canResumeProducer,
  createInitialProducerSnapshot,
  isCurrentRunMessage,
  reduceProducerMessage,
  setProducerStatus,
  startProducerRun
} from '../utils/producer-lifecycle';
import { assertValidProducerSettings, calculateNominalUpdatesPerSecond } from '../utils/producer-settings';

/** Relative to `document.baseURI`; the file is copied to `public/wasm` by `npm run wasm:build`. */
const marketDataWasmPath = 'wasm/market_data_generator.wasm';

/** Creates the seed of each new run. Defaults to a cryptographically random seed; tests may provide a fixed one. */
export const MARKET_DATA_SEED_FACTORY = new InjectionToken<() => bigint>('Market data seed factory', {
  providedIn: 'root',
  factory: () => createRandomSeed
});

/** Absolute URL of the Wasm generator, resolved against the document base URI. */
export const MARKET_DATA_WASM_URL = new InjectionToken<string>('Market data Wasm URL', {
  providedIn: 'root',
  factory: () => new URL(marketDataWasmPath, inject(DOCUMENT).baseURI).toString()
});

/**
 * Application-wide producer state. A root singleton, so navigation never creates another producer
 * and the active run (including its paused state) survives route changes.
 */
@Injectable({ providedIn: 'root' })
export class MarketDataProducerService {
  private readonly workerService = inject(MarketDataWorkerService);
  private readonly createSeed = inject(MARKET_DATA_SEED_FACTORY);
  private readonly wasmUrl = inject(MARKET_DATA_WASM_URL);
  private readonly snapshot = signal<ProducerSnapshot>(createInitialProducerSnapshot(DEFAULT_PRODUCER_SETTINGS));
  private readonly metricsState = signal<readonly InstrumentMetrics[]>([]);
  private readonly errorState = signal<string | null>(null);
  /** Exact accumulators are kept outside signals; only derived display values are published. */
  private accumulators: MarketMetricsState = createMarketMetricsState();
  private readonly messageHandlers: MessageHandlers<WorkerEventMap> = {
    ready: (message) => this.applyLifecycleEvent(message),
    paused: (message) => this.applyLifecycleEvent(message),
    resumed: (message) => this.applyLifecycleEvent(message),
    batch: ({ updates }) => this.applyMarketUpdateBatch(updates),
    error: ({ message }) => this.failWithError(message)
  };

  readonly status = computed(() => this.snapshot().status);
  readonly runId = computed(() => this.snapshot().runId);
  readonly settings = computed(() => this.snapshot().settings);
  readonly metrics = this.metricsState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly nominalUpdatesPerSecond = computed(() => calculateNominalUpdatesPerSecond(this.settings()));

  constructor() {
    this.workerService.registerListeners({
      message: (message) => this.handleWorkerEvent(message),
      error: (message) => this.failWithError(message)
    });
  }

  /** Starts the default simulation; called once at application startup. */
  start(): void {
    this.restart(DEFAULT_PRODUCER_SETTINGS);
  }

  /** Starts a fresh run with the given settings, clearing previous values, regardless of the current status. */
  restart(settings: ProducerSettings): number {
    assertValidProducerSettings(settings);

    const run = startProducerRun(this.snapshot(), { ...settings });

    this.snapshot.set(run);
    this.replaceMetricsState(createMarketMetricsState(createInstrumentSymbols(settings.instrumentCount)));
    this.errorState.set(null);
    this.workerService.post({
      type: 'init',
      runId: run.runId,
      settings: run.settings,
      seed: this.createSeed(),
      wasmUrl: this.wasmUrl
    });

    return run.runId;
  }

  pause(): void {
    if (!canPauseProducer(this.snapshot())) {
      return;
    }

    this.workerService.post({ type: 'pause', runId: this.runId() });
    // Pausing takes effect immediately in the UI; the Worker acknowledgement is idempotent.
    this.snapshot.update((current) => setProducerStatus(current, 'paused'));
  }

  resume(): void {
    if (!canResumeProducer(this.snapshot())) {
      return;
    }

    // Keep the paused state until the Worker acknowledges the resume command.
    this.workerService.post({ type: 'resume', runId: this.runId() });
  }

  private handleWorkerEvent(message: WorkerEvent): void {
    if (isCurrentRunMessage(message, this.runId())) {
      dispatchMessage(this.messageHandlers, message.type, message);
    }
  }

  private applyMarketUpdateBatch(updates: WorkerEventMap['batch']['updates']): void {
    try {
      this.replaceMetricsState(applyMarketUpdates(this.accumulators, updates));
    } catch (error: unknown) {
      this.workerService.post({ type: 'dispose', runId: this.runId() });
      this.failWithError(getErrorMessage(error, 'Invalid market data received.'));
    }
  }

  private failWithError(message: string): void {
    this.errorState.set(message);
    this.snapshot.update((current) => setProducerStatus(current, 'error'));
  }

  private applyLifecycleEvent(message: WorkerEvent): void {
    this.snapshot.update((current) => reduceProducerMessage(current, message));
  }

  private replaceMetricsState(state: MarketMetricsState): void {
    this.accumulators = state;
    this.metricsState.set(selectInstrumentMetrics(state));
  }
}

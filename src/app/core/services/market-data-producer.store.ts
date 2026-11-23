import { computed, inject, Injectable, signal } from '@angular/core';

import { MarketDataWorkerClient } from './market-data-worker.client';
import { createRandomSeed } from '../../shared/utils/create-random-seed';
import { getErrorMessage } from '../../shared/utils/get-error-message';
import { dispatchMessage, type MessageHandlers } from '../../shared/utils/message-dispatch';
import { MARKET_DATA_WASM_PATH } from '../constants/market-data.constants';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import { createInstrumentSymbols } from '../domain/instrument-symbol';
import { applyMarketUpdates, createMarketMetricsState, selectInstrumentMetrics } from '../domain/market-metrics';
import { calculateNominalUpdatesPerSecond } from '../domain/nominal-rate';
import {
  canPauseProducer,
  canResumeProducer,
  createInitialProducerSnapshot,
  isCurrentRunMessage,
  reduceProducerMessage,
  setProducerStatus,
  startProducerRun
} from '../domain/producer-lifecycle';
import { assertValidProducerSettings } from '../domain/producer-settings.validation';
import type { InstrumentMetrics, MarketMetricsState } from '../models/market-data.model';
import type { ProducerSettings } from '../models/producer-settings.model';
import type { ProducerSnapshot } from '../models/producer-state.model';
import type { WorkerToMainMessage, WorkerToMainMessageMap } from '../models/worker-message.model';

/**
 * Application-wide producer state. A root singleton, so navigation never creates another producer
 * and the active run (including its paused state) survives route changes.
 */
@Injectable({ providedIn: 'root' })
export class MarketDataProducerStore {
  private readonly workerClient = inject(MarketDataWorkerClient);
  private readonly snapshot = signal<ProducerSnapshot>(createInitialProducerSnapshot(DEFAULT_PRODUCER_SETTINGS));
  private readonly metricsState = signal<readonly InstrumentMetrics[]>([]);
  private readonly errorState = signal<string | null>(null);
  /** Exact accumulators are kept outside signals; only derived display values are published. */
  private accumulators: MarketMetricsState = createMarketMetricsState();
  private readonly messageHandlers: MessageHandlers<WorkerToMainMessageMap> = {
    ready: (message) => this.updateLifecycle(message),
    paused: (message) => this.updateLifecycle(message),
    resumed: (message) => this.updateLifecycle(message),
    batch: ({ updates }) => this.applyBatch(updates),
    error: ({ message }) => this.fail(message)
  };

  readonly status = computed(() => this.snapshot().status);
  readonly runId = computed(() => this.snapshot().runId);
  readonly settings = computed(() => this.snapshot().settings);
  readonly metrics = this.metricsState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly nominalUpdatesPerSecond = computed(() => calculateNominalUpdatesPerSecond(this.settings()));

  constructor() {
    this.workerClient.connect({
      message: (message) => this.handleWorkerMessage(message),
      error: (message) => this.fail(message)
    });
  }

  /** Starts the default simulation; called once at application startup. */
  start(): void {
    this.applySettings(DEFAULT_PRODUCER_SETTINGS);
  }

  /** Starts a fresh run with the given settings, clearing previous values, regardless of the current status. */
  applySettings(settings: ProducerSettings): number {
    assertValidProducerSettings(settings);

    const run = startProducerRun(this.snapshot(), { ...settings });

    this.snapshot.set(run);
    this.publishMetrics(createMarketMetricsState(createInstrumentSymbols(settings.instrumentCount)));
    this.errorState.set(null);
    this.workerClient.post({
      type: 'init',
      runId: run.runId,
      settings: run.settings,
      seed: createRandomSeed(),
      wasmUrl: new URL(MARKET_DATA_WASM_PATH, document.baseURI).toString()
    });

    return run.runId;
  }

  pause(): void {
    if (!canPauseProducer(this.snapshot())) {
      return;
    }

    this.workerClient.post({ type: 'pause', runId: this.runId() });
    // Pausing takes effect immediately in the UI; the Worker acknowledgement is idempotent.
    this.snapshot.update((current) => setProducerStatus(current, 'paused'));
  }

  resume(): void {
    if (!canResumeProducer(this.snapshot())) {
      return;
    }

    // Keep the paused state until the Worker acknowledges the resume command.
    this.workerClient.post({ type: 'resume', runId: this.runId() });
  }

  private handleWorkerMessage(message: WorkerToMainMessage): void {
    if (isCurrentRunMessage(message, this.runId())) {
      dispatchMessage(this.messageHandlers, message.type, message);
    }
  }

  private applyBatch(updates: WorkerToMainMessageMap['batch']['updates']): void {
    try {
      this.publishMetrics(applyMarketUpdates(this.accumulators, updates));
    } catch (error: unknown) {
      this.workerClient.post({ type: 'dispose', runId: this.runId() });
      this.fail(getErrorMessage(error, 'Invalid market data received.'));
    }
  }

  private fail(message: string): void {
    this.errorState.set(message);
    this.snapshot.update((current) => setProducerStatus(current, 'error'));
  }

  private updateLifecycle(message: WorkerToMainMessage): void {
    this.snapshot.update((current) => reduceProducerMessage(current, message));
  }

  private publishMetrics(state: MarketMetricsState): void {
    this.accumulators = state;
    this.metricsState.set(selectInstrumentMetrics(state));
  }
}

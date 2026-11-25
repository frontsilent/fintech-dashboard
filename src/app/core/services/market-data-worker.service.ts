import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';

import type { WorkerCommand, WorkerEvent } from '../models/worker-message.model';

/** Creates the market-data Worker. Provided by `provideMarketDataWorker()`; replaced by a fake in unit tests. */
export const MARKET_DATA_WORKER_FACTORY = new InjectionToken<() => Worker>('Market data worker factory');

export type MarketDataWorkerListeners = {
  readonly message: (message: WorkerEvent) => void;
  readonly error: (message: string) => void;
};

/** Owns the single market-data Worker instance and its typed message channel. */
@Injectable({ providedIn: 'root' })
export class MarketDataWorkerService {
  private readonly createWorker = inject(MARKET_DATA_WORKER_FACTORY);
  private worker: Worker | null = null;
  private listeners: MarketDataWorkerListeners | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.terminate());
  }

  /** Registers the consumer of Worker events. The Worker itself is created lazily on the first post. */
  registerListeners(listeners: MarketDataWorkerListeners): void {
    this.listeners = listeners;
  }

  post(command: WorkerCommand): void {
    this.getOrCreateWorker().postMessage(command);
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private getOrCreateWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = this.createWorker();

    worker.addEventListener('message', (event: MessageEvent<WorkerEvent>) => {
      this.listeners?.message(event.data);
    });
    worker.addEventListener('error', (event: ErrorEvent) => {
      this.listeners?.error(event.message || 'Market data Worker failed.');
    });
    this.worker = worker;

    return worker;
  }
}

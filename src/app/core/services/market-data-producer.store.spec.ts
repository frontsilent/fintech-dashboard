import { TestBed } from '@angular/core/testing';

import { MarketDataProducerStore } from './market-data-producer.store';
import { MARKET_DATA_WORKER_FACTORY } from './market-data-worker.token';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import type { MarketUpdate } from '../models/market-data.model';
import type { MainToWorkerMessage, WorkerToMainMessage } from '../models/worker-message.model';

class FakeWorker extends EventTarget {
  readonly postMessage = jest.fn<undefined, [MainToWorkerMessage]>();
  readonly terminate = jest.fn();

  emit(message: WorkerToMainMessage): void {
    this.dispatchEvent(new MessageEvent('message', { data: message }));
  }

  lastCommand(): MainToWorkerMessage | undefined {
    return this.postMessage.mock.lastCall?.[0];
  }
}

const update: MarketUpdate = {
  instrument: 'ASSET-01',
  priceCents: 10_000,
  tradeQuantity: 10,
  bidCents: 9_996,
  askCents: 10_000,
  bidQuantity: 600,
  askQuantity: 400
};

const tradeVolume = BigInt(update.tradeQuantity);
const noVolume = 0n;
const nextRunId = 2;
const changedSettings = { ...DEFAULT_PRODUCER_SETTINGS, instrumentCount: 2 };

function setup(): { store: MarketDataProducerStore; worker: FakeWorker } {
  const worker = new FakeWorker();

  TestBed.configureTestingModule({
    providers: [{ provide: MARKET_DATA_WORKER_FACTORY, useValue: () => worker }]
  });

  const store = TestBed.inject(MarketDataProducerStore);

  store.startDefaultSimulation();

  return { store, worker };
}

describe('MarketDataProducerStore', () => {
  it('starts the default run with zero volume and unavailable values', () => {
    const { store, worker } = setup();

    expect(store.runId()).toBe(1);
    expect(store.status()).toBe('initializing');
    expect(store.settings()).toEqual(DEFAULT_PRODUCER_SETTINGS);
    expect(store.metrics()).toHaveLength(DEFAULT_PRODUCER_SETTINGS.instrumentCount);
    expect(store.metrics().every((metric) => metric.tradingVolume === noVolume && metric.lastPriceCents === null)).toBe(true);
    expect(worker.lastCommand()).toMatchObject({ type: 'init', runId: 1, settings: DEFAULT_PRODUCER_SETTINGS });
  });

  it('becomes live when the Worker is ready and aggregates batches of the current run', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update, update] });

    expect(store.status()).toBe('running');
    expect(store.metrics()[0]).toMatchObject({ instrument: 'ASSET-01', tradingVolume: tradeVolume + tradeVolume });
  });

  it('resets values on apply and rejects results from the previous run', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update] });

    const runId = store.restartWithSettings(changedSettings);

    worker.emit({ type: 'batch', runId: 1, updates: [update] });
    worker.emit({ type: 'paused', runId: 1 });

    expect(runId).toBe(nextRunId);
    expect(store.status()).toBe('initializing');
    expect(store.metrics()).toHaveLength(changedSettings.instrumentCount);
    expect(store.metrics().every((metric) => metric.tradingVolume === noVolume)).toBe(true);
    expect(worker.lastCommand()).toMatchObject({ type: 'init', runId: 2, settings: changedSettings });
  });

  it('starts generation when settings are applied to a paused run', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    store.pauseProducer();
    store.restartWithSettings(changedSettings);
    worker.emit({ type: 'ready', runId: 2 });

    expect(store.status()).toBe('running');
  });

  it('pauses immediately and resumes after the Worker acknowledgement, preserving totals', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update] });
    store.pauseProducer();

    expect(worker.lastCommand()).toEqual({ type: 'pause', runId: 1 });
    expect(store.status()).toBe('paused');

    store.resumeProducer();

    expect(worker.lastCommand()).toEqual({ type: 'resume', runId: 1 });
    expect(store.status()).toBe('paused');

    worker.emit({ type: 'resumed', runId: 1 });

    expect(store.status()).toBe('running');
    expect(store.metrics()[0]?.tradingVolume).toBe(tradeVolume);
  });

  it('ignores pause and resume commands that do not match the current status', () => {
    const { store, worker } = setup();
    const commandsAfterStart = worker.postMessage.mock.calls.length;

    store.resumeProducer();
    worker.emit({ type: 'error', runId: 1, message: 'Boom' });
    store.pauseProducer();

    expect(worker.postMessage).toHaveBeenCalledTimes(commandsAfterStart);
  });

  it('stops the run and reports invalid market data', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [{ ...update, askCents: update.bidCents }] });

    expect(worker.lastCommand()).toEqual({ type: 'dispose', runId: 1 });
    expect(store.status()).toBe('error');
    expect(store.error()).toContain('Invalid market update');
  });

  it('surfaces Worker initialization and runtime errors', () => {
    const { store, worker } = setup();

    worker.emit({ type: 'error', runId: 1, message: 'Unable to load WebAssembly module (404 Not Found).' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Unable to load WebAssembly module (404 Not Found).');

    worker.dispatchEvent(new ErrorEvent('error', { message: '' }));

    expect(store.error()).toBe('Market data Worker failed.');
  });

  it('rejects invalid settings without starting a run', () => {
    const { store } = setup();

    expect(() => store.restartWithSettings({ ...DEFAULT_PRODUCER_SETTINGS, batchIntervalMs: 0 })).toThrow(RangeError);
    expect(store.runId()).toBe(1);
  });

  it('terminates the Worker when the application is destroyed', () => {
    const { worker } = setup();

    TestBed.resetTestingModule();

    expect(worker.terminate).toHaveBeenCalled();
  });
});

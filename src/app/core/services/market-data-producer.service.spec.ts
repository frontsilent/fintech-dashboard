import { TestBed } from '@angular/core/testing';

import { MarketDataProducerService } from './market-data-producer.service';
import { MARKET_DATA_WORKER_FACTORY } from './market-data-worker.token';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import type { MarketUpdate } from '../models/market-data.model';
import type { WorkerCommand, WorkerEvent } from '../models/worker-message.model';

class FakeWorker extends EventTarget {
  readonly postMessage = jest.fn<undefined, [WorkerCommand]>();
  readonly terminate = jest.fn();

  emit(message: WorkerEvent): void {
    this.dispatchEvent(new MessageEvent('message', { data: message }));
  }

  lastCommand(): WorkerCommand | undefined {
    return this.postMessage.mock.lastCall?.[0];
  }
}

const update: MarketUpdate = {
  instrument: 'ALFA',
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

function setup(): { producer: MarketDataProducerService; worker: FakeWorker } {
  const worker = new FakeWorker();

  TestBed.configureTestingModule({
    providers: [{ provide: MARKET_DATA_WORKER_FACTORY, useValue: () => worker }]
  });

  const producer = TestBed.inject(MarketDataProducerService);

  producer.start();

  return { producer, worker };
}

describe('MarketDataProducerService', () => {
  it('starts the default run with zero volume and unavailable values', () => {
    const { producer, worker } = setup();

    expect(producer.runId()).toBe(1);
    expect(producer.status()).toBe('initializing');
    expect(producer.settings()).toEqual(DEFAULT_PRODUCER_SETTINGS);
    expect(producer.metrics()).toHaveLength(DEFAULT_PRODUCER_SETTINGS.instrumentCount);
    expect(producer.metrics().every((metric) => metric.tradingVolume === noVolume && metric.lastPriceCents === null)).toBe(true);
    expect(worker.lastCommand()).toMatchObject({ type: 'init', runId: 1, settings: DEFAULT_PRODUCER_SETTINGS });
  });

  it('becomes live when the Worker is ready and aggregates batches of the current run', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update, update] });

    expect(producer.status()).toBe('running');
    expect(producer.metrics()[0]).toMatchObject({ instrument: 'ALFA', tradingVolume: tradeVolume + tradeVolume });
  });

  it('resets values on apply and rejects results from the previous run', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update] });

    const runId = producer.restart(changedSettings);

    worker.emit({ type: 'batch', runId: 1, updates: [update] });
    worker.emit({ type: 'paused', runId: 1 });

    expect(runId).toBe(nextRunId);
    expect(producer.status()).toBe('initializing');
    expect(producer.metrics()).toHaveLength(changedSettings.instrumentCount);
    expect(producer.metrics().every((metric) => metric.tradingVolume === noVolume)).toBe(true);
    expect(worker.lastCommand()).toMatchObject({ type: 'init', runId: 2, settings: changedSettings });
  });

  it('starts generation when settings are applied to a paused run', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    producer.pause();
    producer.restart(changedSettings);
    worker.emit({ type: 'ready', runId: 2 });

    expect(producer.status()).toBe('running');
  });

  it('pauses immediately and resumes after the Worker acknowledgement, preserving totals', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [update] });
    producer.pause();

    expect(worker.lastCommand()).toEqual({ type: 'pause', runId: 1 });
    expect(producer.status()).toBe('paused');

    producer.resume();

    expect(worker.lastCommand()).toEqual({ type: 'resume', runId: 1 });
    expect(producer.status()).toBe('paused');

    worker.emit({ type: 'resumed', runId: 1 });

    expect(producer.status()).toBe('running');
    expect(producer.metrics()[0]?.tradingVolume).toBe(tradeVolume);
  });

  it('ignores pause and resume commands that do not match the current status', () => {
    const { producer, worker } = setup();
    const commandsAfterStart = worker.postMessage.mock.calls.length;

    producer.resume();
    worker.emit({ type: 'error', runId: 1, message: 'Boom' });
    producer.pause();

    expect(worker.postMessage).toHaveBeenCalledTimes(commandsAfterStart);
  });

  it('stops the run and reports invalid market data', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'ready', runId: 1 });
    worker.emit({ type: 'batch', runId: 1, updates: [{ ...update, askCents: update.bidCents }] });

    expect(worker.lastCommand()).toEqual({ type: 'dispose', runId: 1 });
    expect(producer.status()).toBe('error');
    expect(producer.error()).toContain('Invalid market update');
  });

  it('surfaces Worker initialization and runtime errors', () => {
    const { producer, worker } = setup();

    worker.emit({ type: 'error', runId: 1, message: 'Unable to load WebAssembly module (404 Not Found).' });

    expect(producer.status()).toBe('error');
    expect(producer.error()).toBe('Unable to load WebAssembly module (404 Not Found).');

    worker.dispatchEvent(new ErrorEvent('error', { message: '' }));

    expect(producer.error()).toBe('Market data Worker failed.');
  });

  it('rejects invalid settings without starting a run', () => {
    const { producer } = setup();

    expect(() => producer.restart({ ...DEFAULT_PRODUCER_SETTINGS, batchIntervalMs: 0 })).toThrow(RangeError);
    expect(producer.runId()).toBe(1);
  });

  it('terminates the Worker when the application is destroyed', () => {
    const { worker } = setup();

    TestBed.resetTestingModule();

    expect(worker.terminate).toHaveBeenCalled();
  });
});

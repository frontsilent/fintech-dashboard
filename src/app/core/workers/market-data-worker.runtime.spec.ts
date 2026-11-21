import type { MarketDataGenerator } from './market-data-generator.model';
import { MarketDataWorkerRuntime } from './market-data-worker.runtime';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import type { MarketUpdate } from '../models/market-data.model';
import type { MainToWorkerMessageMap, WorkerToMainMessage } from '../models/worker-message.model';

const update: MarketUpdate = {
  instrument: 'ASSET-01',
  priceCents: 10_000,
  tradeQuantity: 1,
  bidCents: 9_996,
  askCents: 10_000,
  bidQuantity: 1,
  askQuantity: 1
};

const settings = { ...DEFAULT_PRODUCER_SETTINGS, updatesPerBatch: 2 };
const seed = 7n;
const run = { first: 1, second: 2 };
const elapsed = {
  oneBatch: settings.batchIntervalMs,
  twoBatches: settings.batchIntervalMs * run.second,
  idle: settings.batchIntervalMs * run.second * run.second
};

const initMessage = (runId: number): MainToWorkerMessageMap['init'] => ({
  type: 'init',
  runId,
  settings,
  seed,
  wasmUrl: 'generator.wasm'
});

function setup(): { runtime: MarketDataWorkerRuntime; posted: WorkerToMainMessage[]; generator: jest.Mocked<MarketDataGenerator> } {
  const posted: WorkerToMainMessage[] = [];
  const generator: jest.Mocked<MarketDataGenerator> = {
    initialize: jest.fn(),
    generateBatch: jest.fn((count: number) => Array.from({ length: count }, () => update))
  };
  const runtime = new MarketDataWorkerRuntime({
    post: (message) => posted.push(message),
    loadGenerator: async () => Promise.resolve(generator)
  });

  return { runtime, posted, generator };
}

const typesOf = (messages: readonly WorkerToMainMessage[], runId?: number): string[] => messages
  .filter((message) => runId === undefined || message.runId === runId)
  .map(({ type }) => type);

describe('MarketDataWorkerRuntime', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('initializes the generator and publishes batches of the requested size on every interval', async () => {
    const { runtime, posted, generator } = setup();

    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.twoBatches);

    expect(generator.initialize).toHaveBeenCalledWith(seed, settings.instrumentCount);
    expect(typesOf(posted)).toEqual(['ready', 'batch', 'batch']);
    expect(posted[1]).toEqual({ type: 'batch', runId: run.first, updates: [update, update] });
  });

  it('stops generating while paused and continues after resume', async () => {
    const { runtime, posted } = setup();

    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);
    runtime.handle({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.idle);
    runtime.handle({ type: 'resume', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted)).toEqual(['ready', 'batch', 'paused', 'resumed', 'batch']);
  });

  it('reports a pause requested during initialization once the generator is ready', async () => {
    const { runtime, posted } = setup();

    runtime.handle(initMessage(run.first));
    runtime.handle({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted)).toEqual(['ready', 'paused']);
  });

  it('ignores commands for a previous run and stops the old run on re-initialization', async () => {
    const { runtime, posted } = setup();

    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);
    runtime.handle(initMessage(run.second));
    runtime.handle({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted, run.first)).toEqual(['ready']);
    expect(typesOf(posted, run.second)).toEqual(['ready', 'batch']);
  });

  it('stops all work after dispose', async () => {
    const { runtime, posted } = setup();

    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);
    runtime.handle({ type: 'dispose', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.idle);

    expect(typesOf(posted)).toEqual(['ready']);
  });

  it('reports invalid settings without loading the generator', () => {
    const { runtime, posted, generator } = setup();

    runtime.handle({ ...initMessage(run.first), settings: { ...settings, instrumentCount: 0 } });

    expect(posted).toEqual([{ type: 'error', runId: run.first, message: 'Worker received invalid producer settings.' }]);
    expect(generator.initialize).not.toHaveBeenCalled();
  });

  it('reports generation failures and stops the run', async () => {
    const { runtime, posted, generator } = setup();

    generator.generateBatch.mockImplementation(() => {
      throw new Error('Out of memory');
    });
    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.idle);

    expect(posted).toEqual([
      { type: 'ready', runId: run.first },
      { type: 'error', runId: run.first, message: 'Out of memory' }
    ]);
  });

  it('reports generator loading failures', async () => {
    const posted: WorkerToMainMessage[] = [];
    const runtime = new MarketDataWorkerRuntime({
      post: (message) => posted.push(message),
      loadGenerator: async () => Promise.reject(new Error('404 Not Found'))
    });

    runtime.handle(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);

    expect(posted).toEqual([{ type: 'error', runId: run.first, message: '404 Not Found' }]);
  });
});

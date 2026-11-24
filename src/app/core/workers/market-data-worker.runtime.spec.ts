import type { MarketDataGenerator } from './market-data-generator.model';
import { MarketDataWorkerRuntime } from './market-data-worker.runtime';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import type { MarketUpdate } from '../models/market-data.model';
import type { WorkerCommandMap, WorkerEvent } from '../models/worker-message.model';

const update: MarketUpdate = {
  instrument: 'ALFA',
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

const initMessage = (runId: number): WorkerCommandMap['init'] => ({
  type: 'init',
  runId,
  settings,
  seed,
  wasmUrl: 'generator.wasm'
});

function setup(): { runtime: MarketDataWorkerRuntime; posted: WorkerEvent[]; generator: jest.Mocked<MarketDataGenerator> } {
  const posted: WorkerEvent[] = [];
  const generator: jest.Mocked<MarketDataGenerator> = {
    initializeRun: jest.fn(),
    generateUpdateBatch: jest.fn((count: number) => Array.from({ length: count }, () => update))
  };
  const runtime = new MarketDataWorkerRuntime({
    postToMainThread: (message) => posted.push(message),
    loadGenerator: async () => Promise.resolve(generator)
  });

  return { runtime, posted, generator };
}

const typesOf = (messages: readonly WorkerEvent[], runId?: number): string[] => messages
  .filter((message) => runId === undefined || message.runId === runId)
  .map(({ type }) => type);

describe('MarketDataWorkerRuntime', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('initializes the generator and publishes batches of the requested size on every interval', async () => {
    const { runtime, posted, generator } = setup();

    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.twoBatches);

    expect(generator.initializeRun).toHaveBeenCalledWith(seed, settings.instrumentCount);
    expect(typesOf(posted)).toEqual(['ready', 'batch', 'batch']);
    expect(posted[1]).toEqual({ type: 'batch', runId: run.first, updates: [update, update] });
  });

  it('stops generating while paused and continues after resume', async () => {
    const { runtime, posted } = setup();

    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);
    runtime.handleMainThreadMessage({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.idle);
    runtime.handleMainThreadMessage({ type: 'resume', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted)).toEqual(['ready', 'batch', 'paused', 'resumed', 'batch']);
  });

  it('reports a pause requested during initialization as a single paused event once the generator is ready', async () => {
    const { runtime, posted } = setup();

    runtime.handleMainThreadMessage(initMessage(run.first));
    runtime.handleMainThreadMessage({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted)).toEqual(['paused']);

    runtime.handleMainThreadMessage({ type: 'resume', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted)).toEqual(['paused', 'resumed', 'batch']);
  });

  it('ignores commands for a previous run and stops the old run on re-initialization', async () => {
    const { runtime, posted } = setup();

    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);
    runtime.handleMainThreadMessage(initMessage(run.second));
    runtime.handleMainThreadMessage({ type: 'pause', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.oneBatch);

    expect(typesOf(posted, run.first)).toEqual(['ready']);
    expect(typesOf(posted, run.second)).toEqual(['ready', 'batch']);
  });

  it('stops all work after dispose', async () => {
    const { runtime, posted } = setup();

    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);
    runtime.handleMainThreadMessage({ type: 'dispose', runId: run.first });
    await jest.advanceTimersByTimeAsync(elapsed.idle);

    expect(typesOf(posted)).toEqual(['ready']);
  });

  it('reports invalid settings without loading the generator', () => {
    const { runtime, posted, generator } = setup();

    runtime.handleMainThreadMessage({ ...initMessage(run.first), settings: { ...settings, instrumentCount: 0 } });

    expect(posted).toEqual([{ type: 'error', runId: run.first, message: 'Worker received invalid producer settings.' }]);
    expect(generator.initializeRun).not.toHaveBeenCalled();
  });

  it('reports generation failures and stops the run', async () => {
    const { runtime, posted, generator } = setup();

    generator.generateUpdateBatch.mockImplementation(() => {
      throw new Error('Out of memory');
    });
    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(elapsed.idle);

    expect(posted).toEqual([
      { type: 'ready', runId: run.first },
      { type: 'error', runId: run.first, message: 'Out of memory' }
    ]);
  });

  it('reports generator loading failures', async () => {
    const posted: WorkerEvent[] = [];
    const runtime = new MarketDataWorkerRuntime({
      postToMainThread: (message) => posted.push(message),
      loadGenerator: async () => Promise.reject(new Error('404 Not Found'))
    });

    runtime.handleMainThreadMessage(initMessage(run.first));
    await jest.advanceTimersByTimeAsync(0);

    expect(posted).toEqual([{ type: 'error', runId: run.first, message: '404 Not Found' }]);
  });
});

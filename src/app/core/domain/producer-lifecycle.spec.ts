import {
  canPauseProducer,
  canResumeProducer,
  createInitialProducerSnapshot,
  isCurrentRunMessage,
  reduceProducerMessage,
  startProducerRun
} from './producer-lifecycle';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';
import type { ProducerSnapshot } from '../models/producer-state.model';
import type { WorkerEvent } from '../models/worker-message.model';

const previousRunId = 4;
const changedInstrumentCount = 8;

const snapshot = (overrides: Partial<ProducerSnapshot> = {}): ProducerSnapshot => ({
  ...createInitialProducerSnapshot(DEFAULT_PRODUCER_SETTINGS),
  ...overrides
});

describe('producer lifecycle', () => {
  it('starts a new run with reset status and a new run id', () => {
    const paused = snapshot({ runId: previousRunId, status: 'paused' });
    const next = startProducerRun(paused, { ...DEFAULT_PRODUCER_SETTINGS, instrumentCount: changedInstrumentCount });

    expect(next.runId).toBe(previousRunId + 1);
    expect(next.status).toBe('initializing');
    expect(next.settings.instrumentCount).toBe(changedInstrumentCount);
  });

  it('transitions through ready, paused, resumed and error states', () => {
    let state = startProducerRun(snapshot(), DEFAULT_PRODUCER_SETTINGS);
    const runId = state.runId;

    state = reduceProducerMessage(state, { type: 'ready', runId });
    expect(state.status).toBe('running');
    state = reduceProducerMessage(state, { type: 'paused', runId });
    expect(state.status).toBe('paused');
    state = reduceProducerMessage(state, { type: 'resumed', runId });
    expect(state.status).toBe('running');
    state = reduceProducerMessage(state, { type: 'error', runId, message: 'Failure' });
    expect(state.status).toBe('error');
  });

  it('ignores messages belonging to an old run', () => {
    const state = startProducerRun(snapshot(), DEFAULT_PRODUCER_SETTINGS);
    const staleMessage: WorkerEvent = { type: 'paused', runId: state.runId - 1 };

    expect(isCurrentRunMessage(staleMessage, state.runId)).toBe(false);
    expect(reduceProducerMessage(state, staleMessage)).toBe(state);
  });

  it('does not change lifecycle state for a batch message', () => {
    const state = snapshot({ runId: 2, status: 'running' });

    expect(reduceProducerMessage(state, { type: 'batch', runId: state.runId, updates: [] })).toBe(state);
  });

  it('allows pausing only an active run and resuming only a paused run', () => {
    expect(canPauseProducer(snapshot({ status: 'running' }))).toBe(true);
    expect(canPauseProducer(snapshot({ status: 'initializing' }))).toBe(true);
    expect(canPauseProducer(snapshot({ status: 'paused' }))).toBe(false);
    expect(canResumeProducer(snapshot({ status: 'paused' }))).toBe(true);
    expect(canResumeProducer(snapshot({ status: 'error' }))).toBe(false);
  });
});

import type { ProducerSettings } from '../models/producer-settings.model';
import type { ProducerSnapshot, ProducerStatus } from '../models/producer-state.model';
import type { WorkerEvent } from '../models/worker-message.model';

/** Status each Worker event moves the run to; `null` keeps the current status. */
const statusByWorkerMessage = {
  ready: 'running',
  resumed: 'running',
  paused: 'paused',
  error: 'error',
  batch: null
} as const satisfies Record<WorkerEvent['type'], ProducerStatus | null>;

const pausableStatuses: ReadonlySet<ProducerStatus> = new Set(['initializing', 'running']);

export function createInitialProducerSnapshot(settings: ProducerSettings): ProducerSnapshot {
  return { runId: 0, status: 'idle', settings };
}

/** Applying settings always creates a fresh run, even if the previous one was paused. */
export function startProducerRun(current: ProducerSnapshot, settings: ProducerSettings): ProducerSnapshot {
  return { runId: current.runId + 1, status: 'initializing', settings };
}

export function isCurrentRunMessage(message: WorkerEvent, activeRunId: number): boolean {
  return message.runId === activeRunId;
}

export function canPauseProducer({ status }: ProducerSnapshot): boolean {
  return pausableStatuses.has(status);
}

export function canResumeProducer({ status }: ProducerSnapshot): boolean {
  return status === 'paused';
}

export function setProducerStatus(current: ProducerSnapshot, status: ProducerStatus): ProducerSnapshot {
  return status === current.status ? current : { ...current, status };
}

/** Returns the same snapshot instance when the message is stale or does not change the status. */
export function reduceProducerMessage(current: ProducerSnapshot, message: WorkerEvent): ProducerSnapshot {
  const status = isCurrentRunMessage(message, current.runId) ? statusByWorkerMessage[message.type] : null;

  return status === null ? current : setProducerStatus(current, status);
}

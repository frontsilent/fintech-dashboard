import type { ProducerStatus } from '../models/producer-state.model';

export const PRODUCER_STATUS_LABELS = {
  idle: 'Idle',
  initializing: 'Initializing',
  running: 'Live',
  paused: 'Paused',
  error: 'Error'
} as const satisfies Record<ProducerStatus, string>;

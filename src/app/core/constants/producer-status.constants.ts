import type { StatusAppearance } from '../../shared/ui/status-dot/status-appearance.type';
import type { ProducerStatus } from '../models/producer-state.model';

export const PRODUCER_STATUS_LABELS = {
  idle: 'Idle',
  initializing: 'Initializing',
  running: 'Live',
  paused: 'Paused',
  error: 'Error'
} as const satisfies Record<ProducerStatus, string>;

export const PRODUCER_STATUS_APPEARANCE = {
  idle: 'neutral',
  initializing: 'neutral',
  running: 'success',
  paused: 'warning',
  error: 'error'
} as const satisfies Record<ProducerStatus, StatusAppearance>;

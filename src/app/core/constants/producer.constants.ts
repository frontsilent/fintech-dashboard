import type { NumberRange } from '../../shared/utils/number-range';
import type { ProducerSettings, ProducerSettingsField, ProducerStatus } from '../models/producer.model';

export const DEFAULT_PRODUCER_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500
};

/** Inclusive limits required by the specification; also enforced by the Wasm generator. */
export const PRODUCER_SETTINGS_LIMITS = {
  instrumentCount: { min: 1, max: 50 },
  updatesPerBatch: { min: 1, max: 1_000 },
  batchIntervalMs: { min: 50, max: 2_000 }
} as const satisfies Record<ProducerSettingsField, NumberRange>;

export const PRODUCER_SETTINGS_FIELDS = [
  'instrumentCount',
  'updatesPerBatch',
  'batchIntervalMs'
] as const satisfies readonly ProducerSettingsField[];

export const PRODUCER_STATUS_LABELS = {
  idle: 'Idle',
  initializing: 'Initializing',
  running: 'Live',
  paused: 'Paused',
  error: 'Error'
} as const satisfies Record<ProducerStatus, string>;

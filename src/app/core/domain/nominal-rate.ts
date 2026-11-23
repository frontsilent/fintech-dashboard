import type { ProducerSettings } from '../models/producer-settings.model';

type RateSettings = Pick<ProducerSettings, 'updatesPerBatch' | 'batchIntervalMs'>;

const msPerSecond = 1_000;

/** Requested updates per second across all instruments; `0` when the interval is not positive. */
export function calculateNominalUpdatesPerSecond({ updatesPerBatch, batchIntervalMs }: RateSettings): number {
  return batchIntervalMs > 0 ? updatesPerBatch * msPerSecond / batchIntervalMs : 0;
}

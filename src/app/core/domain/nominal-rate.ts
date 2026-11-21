import { MS_PER_SECOND } from '../constants/market-data.constants';
import type { ProducerSettings } from '../models/producer-settings.model';

type RateSettings = Pick<ProducerSettings, 'updatesPerBatch' | 'batchIntervalMs'>;

/** Requested updates per second across all instruments; `0` when the interval is not positive. */
export function calculateNominalUpdatesPerSecond({ updatesPerBatch, batchIntervalMs }: RateSettings): number {
  return batchIntervalMs > 0 ? updatesPerBatch * MS_PER_SECOND / batchIntervalMs : 0;
}

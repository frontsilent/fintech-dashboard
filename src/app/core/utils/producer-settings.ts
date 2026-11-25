import { isIntegerInRange } from '../../shared/utils/number-range';
import { PRODUCER_SETTINGS_FIELDS, PRODUCER_SETTINGS_LIMITS } from '../constants/producer.constants';
import type { ProducerSettings, ProducerSettingsField } from '../models/producer.model';

type RateSettings = Pick<ProducerSettings, 'updatesPerBatch' | 'batchIntervalMs'>;

const msPerSecond = 1_000;

/**
 * Domain guard for settings that reach the producer. User-facing field messages belong to the
 * form validators (`shared/validators/integer-range.validators.ts`), which use the same limits.
 */
function getInvalidFields(settings: ProducerSettings): readonly ProducerSettingsField[] {
  return PRODUCER_SETTINGS_FIELDS.filter(
    (field) => !isIntegerInRange(settings[field], PRODUCER_SETTINGS_LIMITS[field])
  );
}

export function isValidProducerSettings(settings: ProducerSettings): boolean {
  return getInvalidFields(settings).length === 0;
}

export function assertValidProducerSettings(settings: ProducerSettings): void {
  const invalidFields = getInvalidFields(settings);

  if (invalidFields.length > 0) {
    const details = invalidFields
      .map((field) => {
        const { min, max } = PRODUCER_SETTINGS_LIMITS[field];

        return `${field} must be an integer between ${min} and ${max}`;
      })
      .join('; ');

    throw new RangeError(`Invalid producer settings: ${details}.`);
  }
}

/** True when every producer setting has the same value in both objects. */
export function areProducerSettingsEqual(left: ProducerSettings, right: ProducerSettings): boolean {
  return PRODUCER_SETTINGS_FIELDS.every((field) => left[field] === right[field]);
}

/** Requested updates per second across all instruments; `0` when the interval is not positive. */
export function calculateNominalUpdatesPerSecond({ updatesPerBatch, batchIntervalMs }: RateSettings): number {
  return batchIntervalMs > 0 ? (updatesPerBatch * msPerSecond) / batchIntervalMs : 0;
}

import { isIntegerInRange } from '../../shared/utils/number-range';
import { PRODUCER_SETTINGS_FIELDS, PRODUCER_SETTINGS_LIMITS } from '../constants/producer-settings.constants';
import type { ProducerSettings, ProducerSettingsField } from '../models/producer-settings.model';

/**
 * Domain guard for settings that reach the producer. User-facing field messages belong to the
 * form validators (`shared/validators/integer-range.validators.ts`), which use the same limits.
 */
function getInvalidFields(settings: ProducerSettings): readonly ProducerSettingsField[] {
  return PRODUCER_SETTINGS_FIELDS.filter((field) => !isIntegerInRange(settings[field], PRODUCER_SETTINGS_LIMITS[field]));
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

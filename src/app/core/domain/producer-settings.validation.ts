import { isIntegerInRange, type NumberRange } from '../../shared/utils/number-range';
import { PRODUCER_SETTINGS_FIELDS, PRODUCER_SETTINGS_LIMITS } from '../constants/producer-settings.constants';
import type { ProducerSettings, ProducerSettingsField } from '../models/producer-settings.model';

export type ProducerSettingsErrors = Partial<Record<ProducerSettingsField, string>>;

export type ProducerSettingsValidation = {
  readonly valid: boolean;
  readonly errors: ProducerSettingsErrors;
}

function getFieldError(value: number, range: NumberRange): string | null {
  if (!Number.isInteger(value)) {
    return 'Value must be an integer.';
  }

  return isIntegerInRange(value, range) ? null : `Value must be between ${range.min} and ${range.max}.`;
}

export function isValidProducerSettings(settings: ProducerSettings): boolean {
  return PRODUCER_SETTINGS_FIELDS.every((field) => isIntegerInRange(settings[field], PRODUCER_SETTINGS_LIMITS[field]));
}

export function validateProducerSettings(settings: ProducerSettings): ProducerSettingsValidation {
  const errors: ProducerSettingsErrors = {};

  for (const field of PRODUCER_SETTINGS_FIELDS) {
    const error = getFieldError(settings[field], PRODUCER_SETTINGS_LIMITS[field]);

    if (error !== null) {
      errors[field] = error;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function assertValidProducerSettings(settings: ProducerSettings): void {
  const { valid, errors } = validateProducerSettings(settings);

  if (!valid) {
    const details = Object.entries(errors).map(([field, message]) => `${field}: ${message}`).join('; ');

    throw new RangeError(`Invalid producer settings: ${details}`);
  }
}

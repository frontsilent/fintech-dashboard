import {
  assertValidProducerSettings,
  isValidProducerSettings,
  validateProducerSettings
} from './producer-settings.validation';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer-settings.constants';

describe('producer settings validation', () => {
  it('accepts default settings', () => {
    expect(validateProducerSettings(DEFAULT_PRODUCER_SETTINGS)).toEqual({ valid: true, errors: {} });
    expect(isValidProducerSettings(DEFAULT_PRODUCER_SETTINGS)).toBe(true);
  });

  it('accepts values at all inclusive boundaries', () => {
    expect(validateProducerSettings({ instrumentCount: 1, updatesPerBatch: 1, batchIntervalMs: 50 }).valid).toBe(true);
    expect(validateProducerSettings({ instrumentCount: 50, updatesPerBatch: 1_000, batchIntervalMs: 2_000 }).valid).toBe(true);
  });

  it('rejects non-integer values', () => {
    const settings = { instrumentCount: 2.5, updatesPerBatch: 100, batchIntervalMs: 500 };
    const result = validateProducerSettings(settings);

    expect(result.valid).toBe(false);
    expect(result.errors.instrumentCount).toBe('Value must be an integer.');
    expect(isValidProducerSettings(settings)).toBe(false);
  });

  it('rejects values outside configured ranges', () => {
    const result = validateProducerSettings({ instrumentCount: 51, updatesPerBatch: 0, batchIntervalMs: 2_001 });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      instrumentCount: 'Value must be between 1 and 50.',
      updatesPerBatch: 'Value must be between 1 and 1000.',
      batchIntervalMs: 'Value must be between 50 and 2000.'
    });
  });

  it('throws a useful error when settings are invalid', () => {
    expect(() => assertValidProducerSettings({ instrumentCount: 0, updatesPerBatch: 100, batchIntervalMs: 500 }))
      .toThrow(/instrumentCount/);
  });
});

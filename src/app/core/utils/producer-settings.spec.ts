import {
  assertValidProducerSettings,
  calculateNominalUpdatesPerSecond,
  isValidProducerSettings
} from './producer-settings';
import { DEFAULT_PRODUCER_SETTINGS } from '../constants/producer.constants';

const defaultRate = 200;

describe('producer settings validation', () => {
  it('accepts default settings', () => {
    expect(isValidProducerSettings(DEFAULT_PRODUCER_SETTINGS)).toBe(true);
    expect(() => assertValidProducerSettings(DEFAULT_PRODUCER_SETTINGS)).not.toThrow();
  });

  it('accepts values at all inclusive boundaries', () => {
    expect(isValidProducerSettings({ instrumentCount: 1, updatesPerBatch: 1, batchIntervalMs: 50 })).toBe(true);
    expect(isValidProducerSettings({ instrumentCount: 50, updatesPerBatch: 1_000, batchIntervalMs: 2_000 })).toBe(true);
  });

  it('rejects non-integer values', () => {
    expect(isValidProducerSettings({ instrumentCount: 2.5, updatesPerBatch: 100, batchIntervalMs: 500 })).toBe(false);
  });

  it('rejects values outside configured ranges', () => {
    expect(isValidProducerSettings({ instrumentCount: 51, updatesPerBatch: 100, batchIntervalMs: 500 })).toBe(false);
    expect(isValidProducerSettings({ instrumentCount: 5, updatesPerBatch: 0, batchIntervalMs: 500 })).toBe(false);
    expect(isValidProducerSettings({ instrumentCount: 5, updatesPerBatch: 100, batchIntervalMs: 2_001 })).toBe(false);
  });

  it('names every invalid field and its range in the thrown error', () => {
    expect(() =>
      assertValidProducerSettings({ instrumentCount: 51, updatesPerBatch: 0, batchIntervalMs: 500 })
    ).toThrow(
      'Invalid producer settings: instrumentCount must be an integer between 1 and 50; ' +
        'updatesPerBatch must be an integer between 1 and 1000.'
    );
  });
});

describe('calculateNominalUpdatesPerSecond', () => {
  it('returns the rate across all instruments', () => {
    expect(calculateNominalUpdatesPerSecond({ updatesPerBatch: 100, batchIntervalMs: 500 })).toBe(defaultRate);
  });

  it('returns zero for a non-positive interval', () => {
    expect(calculateNominalUpdatesPerSecond({ updatesPerBatch: 100, batchIntervalMs: 0 })).toBe(0);
  });
});

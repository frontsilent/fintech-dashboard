import { calculateNominalUpdatesPerSecond } from './nominal-rate';

const defaultRate = 200;

describe('calculateNominalUpdatesPerSecond', () => {
  it('returns the rate across all instruments', () => {
    expect(calculateNominalUpdatesPerSecond({ updatesPerBatch: 100, batchIntervalMs: 500 })).toBe(defaultRate);
  });

  it('returns zero for a non-positive interval', () => {
    expect(calculateNominalUpdatesPerSecond({ updatesPerBatch: 100, batchIntervalMs: 0 })).toBe(0);
  });
});

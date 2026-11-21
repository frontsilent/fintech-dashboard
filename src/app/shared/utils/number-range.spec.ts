import { isIntegerInRange, isNonNegativeSafeInteger, isPositiveSafeInteger } from './number-range';

const range = { min: 1, max: 10 };
const belowRange = 0;
const aboveRange = 11;
const fraction = 2.5;

describe('number range utils', () => {
  it('accepts integers inside an inclusive range', () => {
    expect(isIntegerInRange(range.min, range)).toBe(true);
    expect(isIntegerInRange(range.max, range)).toBe(true);
  });

  it('rejects values outside the range and fractions', () => {
    expect(isIntegerInRange(belowRange, range)).toBe(false);
    expect(isIntegerInRange(aboveRange, range)).toBe(false);
    expect(isIntegerInRange(fraction, range)).toBe(false);
  });

  it('distinguishes positive and non-negative safe integers', () => {
    expect(isPositiveSafeInteger(0)).toBe(false);
    expect(isNonNegativeSafeInteger(0)).toBe(true);
    expect(isNonNegativeSafeInteger(-1)).toBe(false);
    expect(isPositiveSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});

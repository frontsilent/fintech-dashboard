import { FormControl } from '@angular/forms';

import { getIntegerRangeErrorMessage, integerRangeValidators } from './integer-range.validators';

const range = { min: 50, max: 2_000 };
const fraction = 75.5;
const below = 49;
const above = 2_001;

const messageFor = (value: number | null): string | null => {
  const control = new FormControl<number | null>(value, integerRangeValidators(range));

  return getIntegerRangeErrorMessage(control.errors, range);
};

describe('integer range validators', () => {
  it('accepts whole numbers within the inclusive range', () => {
    expect(messageFor(range.min)).toBeNull();
    expect(messageFor(range.max)).toBeNull();
  });

  it('reports missing, fractional and out-of-range values', () => {
    expect(messageFor(null)).toBe('This field is required.');
    expect(messageFor(fraction)).toBe('Enter a whole number.');
    expect(messageFor(below)).toBe('Minimum value is 50.');
    expect(messageFor(above)).toBe('Maximum value is 2000.');
  });
});

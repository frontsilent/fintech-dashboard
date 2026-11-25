/** Inclusive numeric range. */
export type NumberRange = {
  readonly min: number;
  readonly max: number;
};

export function isIntegerInRange(value: number, { min, max }: NumberRange): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

import { type AbstractControl, type ValidationErrors, type ValidatorFn, Validators } from '@angular/forms';

import type { NumberRange } from '../utils/number-range';

type IntegerRangeErrorKey = 'required' | 'integer' | 'min' | 'max';

/** Checked in this order so the most fundamental problem is reported first. */
const errorPriority = ['required', 'integer', 'min', 'max'] as const satisfies readonly IntegerRangeErrorKey[];

const errorMessages = {
  required: () => 'This field is required.',
  integer: () => 'Enter a whole number.',
  min: ({ min }) => `Minimum value is ${min}.`,
  max: ({ max }) => `Maximum value is ${max}.`
} as const satisfies Record<IntegerRangeErrorKey, (range: NumberRange) => string>;

export function integerValidator(control: AbstractControl<number | null>): ValidationErrors | null {
  return control.value === null || Number.isInteger(control.value) ? null : { integer: true };
}

/** Required whole number within an inclusive range. */
export function integerRangeValidators(range: NumberRange): ValidatorFn[] {
  return [Validators.required, integerValidator, Validators.min(range.min), Validators.max(range.max)];
}

/** Human-readable message for errors produced by `integerRangeValidators`, or `null` when valid. */
export function getIntegerRangeErrorMessage(errors: ValidationErrors | null, range: NumberRange): string | null {
  const key = errorPriority.find((errorKey) => errors?.[errorKey] !== undefined);

  return key ? errorMessages[key](range) : null;
}

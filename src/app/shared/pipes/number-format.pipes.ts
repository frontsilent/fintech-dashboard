import { Pipe, type PipeTransform } from '@angular/core';

import { formatInteger, formatSignedRatio, formatUsdCents } from '../utils/number-format';

export type NumberSign = 'positive' | 'negative' | 'zero';

@Pipe({ name: 'usdCents' })
export class UsdCentsPipe implements PipeTransform {
  transform(valueCents: number | null): string {
    return formatUsdCents(valueCents);
  }
}

@Pipe({ name: 'integer' })
export class IntegerPipe implements PipeTransform {
  transform(value: number | bigint): string {
    return formatInteger(value);
  }
}

@Pipe({ name: 'signedRatio' })
export class SignedRatioPipe implements PipeTransform {
  transform(value: number | null): string {
    return formatSignedRatio(value);
  }
}

/** Classifies a value for sign-based styling; `null` stays unclassified. */
@Pipe({ name: 'numberSign' })
export class NumberSignPipe implements PipeTransform {
  transform(value: number | null): NumberSign | null {
    if (value === null) {
      return null;
    }

    if (value === 0) {
      return 'zero';
    }

    return value > 0 ? 'positive' : 'negative';
  }
}

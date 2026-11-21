const unavailableValue = '—';
const centsPerDollar = 100;
const ratioFractionDigits = 4;

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const signedRatioFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: ratioFractionDigits,
  maximumFractionDigits: ratioFractionDigits,
  signDisplay: 'exceptZero'
});

/** Formats integer cents as USD; `null` means the value is unavailable. */
export function formatUsdCents(valueCents: number | null): string {
  return valueCents === null ? unavailableValue : usdFormatter.format(valueCents / centsPerDollar);
}

export function formatInteger(value: number | bigint): string {
  return integerFormatter.format(value);
}

/** Formats a signed ratio in [−1, +1], e.g. `+0.2000`; `null` means the value is unavailable. */
export function formatSignedRatio(value: number | null): string {
  return value === null ? unavailableValue : signedRatioFormatter.format(value);
}

export function formatDecimal(value: number, maximumFractionDigits: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

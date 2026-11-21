import { formatDecimal, formatInteger, formatSignedRatio, formatUsdCents } from './number-format';

const priceCents = 10_150;
const spreadCents = 4;
const volume = 1_234_567n;
const positiveRatio = 0.2;
const negativeRatio = -0.15;
const rate = 1_234.5678;
const twoDecimals = 2;

describe('number formatters', () => {
  it('formats integer cents as USD', () => {
    expect(formatUsdCents(priceCents)).toBe('$101.50');
    expect(formatUsdCents(spreadCents)).toBe('$0.04');
  });

  it('renders unavailable values as an em dash', () => {
    expect(formatUsdCents(null)).toBe('—');
    expect(formatSignedRatio(null)).toBe('—');
  });

  it('formats BigInt volume with grouping', () => {
    expect(formatInteger(volume)).toBe('1,234,567');
  });

  it('formats a ratio as a signed value between -1 and +1', () => {
    expect(formatSignedRatio(positiveRatio)).toBe('+0.2000');
    expect(formatSignedRatio(negativeRatio)).toBe('-0.1500');
    expect(formatSignedRatio(0)).toBe('0.0000');
  });

  it('formats decimals with the requested precision', () => {
    expect(formatDecimal(rate, 0)).toBe('1,235');
    expect(formatDecimal(rate, twoDecimals)).toBe('1,234.57');
  });
});

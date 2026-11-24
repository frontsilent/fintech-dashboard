import { isValidMarketUpdate } from './market-update';
import type { MarketUpdate } from '../models/market-data.model';

const update = (overrides: Partial<MarketUpdate> = {}): MarketUpdate => ({
  instrument: 'ALFA',
  priceCents: 10_000,
  tradeQuantity: 10,
  bidCents: 9_996,
  askCents: 10_000,
  bidQuantity: 600,
  askQuantity: 400,
  ...overrides
});

const unsafeInteger = Number.MAX_SAFE_INTEGER + 1;
const fractional = 1.5;

describe('isValidMarketUpdate', () => {
  it('accepts a trade at the ask', () => {
    expect(isValidMarketUpdate(update())).toBe(true);
  });

  it('accepts a trade at the bid', () => {
    expect(isValidMarketUpdate(update({ priceCents: 9_996 }))).toBe(true);
  });

  it('accepts empty order-book sides', () => {
    expect(isValidMarketUpdate(update({ bidQuantity: 0, askQuantity: 0 }))).toBe(true);
  });

  it.each(['', '   '])('rejects a blank instrument %j', (instrument) => {
    expect(isValidMarketUpdate(update({ instrument }))).toBe(false);
  });

  it.each([
    ['priceCents', 0],
    ['tradeQuantity', 0],
    ['bidCents', 0],
    ['askCents', -1],
    ['tradeQuantity', fractional],
    ['priceCents', Number.NaN],
    ['tradeQuantity', unsafeInteger]
  ] as const)('rejects non-positive or non-integer %s = %p', (field, value) => {
    expect(isValidMarketUpdate(update({ [field]: value }))).toBe(false);
  });

  it.each([
    ['bidQuantity', -1],
    ['askQuantity', fractional],
    ['bidQuantity', Number.POSITIVE_INFINITY]
  ] as const)('rejects negative or non-integer %s = %p', (field, value) => {
    expect(isValidMarketUpdate(update({ [field]: value }))).toBe(false);
  });

  it('rejects a locked book where ask equals bid', () => {
    expect(isValidMarketUpdate(update({ bidCents: 10_000, askCents: 10_000, priceCents: 10_000 }))).toBe(false);
  });

  it('rejects a crossed book where ask is below bid', () => {
    expect(isValidMarketUpdate(update({ bidCents: 10_004, askCents: 10_000, priceCents: 10_000 }))).toBe(false);
  });

  it('rejects a trade between bid and ask', () => {
    expect(isValidMarketUpdate(update({ priceCents: 9_998 }))).toBe(false);
  });
});

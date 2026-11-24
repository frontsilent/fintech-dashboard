import { isNonNegativeSafeInteger, isPositiveSafeInteger } from '../../shared/utils/number-range';
import type { MarketUpdate, MarketUpdateNumericField } from '../models/market-data.model';

type MarketUpdateRule = (update: MarketUpdate) => boolean;
type NumberPredicate = (value: number) => boolean;

/** Prices and trade size must be strictly positive safe integers. */
const positiveFields = [
  'priceCents',
  'tradeQuantity',
  'bidCents',
  'askCents'
] as const satisfies readonly MarketUpdateNumericField[];

/** Order-book depth may be empty but never negative. */
const nonNegativeFields = [
  'bidQuantity',
  'askQuantity'
] as const satisfies readonly MarketUpdateNumericField[];

/** True when every listed numeric field of the update satisfies the predicate. */
function fieldsSatisfy(
  update: MarketUpdate,
  fields: readonly MarketUpdateNumericField[],
  predicate: NumberPredicate
): boolean {
  return fields.every((field: MarketUpdateNumericField): boolean => predicate(update[field]));
}

function hasInstrument({ instrument }: MarketUpdate): boolean {
  return instrument.trim().length > 0;
}

function hasPositiveValues(update: MarketUpdate): boolean {
  return fieldsSatisfy(update, positiveFields, isPositiveSafeInteger);
}

function hasNonNegativeQuantities(update: MarketUpdate): boolean {
  return fieldsSatisfy(update, nonNegativeFields, isNonNegativeSafeInteger);
}

/** The ask must sit strictly above the bid; a locked or crossed book is rejected. */
function hasUncrossedBook({ bidCents, askCents }: MarketUpdate): boolean {
  return askCents > bidCents;
}

/** In this simplified model every trade executes at the current bid or ask. */
function isTradedAtBookPrice({ priceCents, bidCents, askCents }: MarketUpdate): boolean {
  return priceCents === bidCents || priceCents === askCents;
}

/** Order matters: value checks run before the price comparisons that rely on them. */
const marketUpdateRules: readonly MarketUpdateRule[] = [
  hasInstrument,
  hasPositiveValues,
  hasNonNegativeQuantities,
  hasUncrossedBook,
  isTradedAtBookPrice
];

/** Guards the producer boundary so malformed producer messages cannot corrupt aggregates. */
export function isValidMarketUpdate(update: MarketUpdate): boolean {
  return marketUpdateRules.every((rule) => rule(update));
}

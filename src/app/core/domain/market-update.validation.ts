import { isNonNegativeSafeInteger, isPositiveSafeInteger } from '../../shared/utils/number-range';
import { MARKET_UPDATE_NON_NEGATIVE_FIELDS, MARKET_UPDATE_POSITIVE_FIELDS } from '../constants/market-data.constants';
import type { MarketUpdate, MarketUpdateNumericField } from '../models/market-data.model';

type MarketUpdateRule = (update: MarketUpdate) => boolean;
type NumberPredicate = (value: number) => boolean;

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
  return fieldsSatisfy(update, MARKET_UPDATE_POSITIVE_FIELDS, isPositiveSafeInteger);
}

function hasNonNegativeQuantities(update: MarketUpdate): boolean {
  return fieldsSatisfy(update, MARKET_UPDATE_NON_NEGATIVE_FIELDS, isNonNegativeSafeInteger);
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

/** Guards the domain boundary so malformed producer messages cannot corrupt aggregates. */
export function isValidMarketUpdate(update: MarketUpdate): boolean {
  return marketUpdateRules.every((rule) => rule(update));
}

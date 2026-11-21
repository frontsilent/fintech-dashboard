import { isNonNegativeSafeInteger, isPositiveSafeInteger } from '../../shared/utils/number-range';
import type { MarketUpdate } from '../models/market-data.model';

type NumericMarketUpdateField = Exclude<keyof MarketUpdate, 'instrument'>;

const positiveFields = [
  'priceCents',
  'tradeQuantity',
  'bidCents',
  'askCents'
] as const satisfies readonly NumericMarketUpdateField[];

const nonNegativeFields = ['bidQuantity', 'askQuantity'] as const satisfies readonly NumericMarketUpdateField[];

/** In this simplified model every trade executes at the current bid or ask. */
function isTradedAtBookPrice({ priceCents, bidCents, askCents }: MarketUpdate): boolean {
  return priceCents === bidCents || priceCents === askCents;
}

/** Guards the domain boundary so malformed producer messages cannot corrupt aggregates. */
export function isValidMarketUpdate(update: MarketUpdate): boolean {
  return update.instrument.trim().length > 0
    && positiveFields.every((field) => isPositiveSafeInteger(update[field]))
    && nonNegativeFields.every((field) => isNonNegativeSafeInteger(update[field]))
    && update.askCents > update.bidCents
    && isTradedAtBookPrice(update);
}

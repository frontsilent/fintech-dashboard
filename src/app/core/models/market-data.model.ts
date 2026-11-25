/** A single generated trade and its associated latest order-book snapshot. */
export type MarketUpdate = {
  readonly instrument: string;
  /** Integer cents. */
  readonly priceCents: number;
  readonly tradeQuantity: number;
  /** Integer cents. */
  readonly bidCents: number;
  /** Integer cents. */
  readonly askCents: number;
  readonly bidQuantity: number;
  readonly askQuantity: number;
};

/** Every `MarketUpdate` field that holds an integer. */
export type MarketUpdateNumericField = Exclude<keyof MarketUpdate, 'instrument'>;

/** Values ready for presentation. Null means that the metric is not available yet. */
export type InstrumentMetrics = {
  readonly instrument: string;
  readonly lastPriceCents: number | null;
  readonly spreadCents: number | null;
  readonly tradingVolume: bigint;
  readonly vwapCents: number | null;
  readonly orderBookImbalance: number | null;
};

/** Internal cumulative state; BigInt keeps VWAP arithmetic exact during long runs. */
export type InstrumentAccumulator = {
  readonly instrument: string;
  readonly lastPriceCents: number | null;
  readonly bidCents: number | null;
  readonly askCents: number | null;
  readonly bidQuantity: number;
  readonly askQuantity: number;
  readonly cumulativeVolume: bigint;
  readonly cumulativeNotionalCents: bigint;
};

export type MarketMetricsState = ReadonlyMap<string, InstrumentAccumulator>;

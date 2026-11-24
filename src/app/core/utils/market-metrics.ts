import { isValidMarketUpdate } from './market-update';
import type {
  InstrumentAccumulator,
  InstrumentMetrics,
  MarketMetricsState,
  MarketUpdate
} from '../models/market-data.model';

const noVolume = 0n;

function createEmptyAccumulator(instrument: string): InstrumentAccumulator {
  return {
    instrument,
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQuantity: 0,
    askQuantity: 0,
    cumulativeVolume: noVolume,
    cumulativeNotionalCents: noVolume
  };
}

function accumulateUpdate(previous: InstrumentAccumulator, update: MarketUpdate): InstrumentAccumulator {
  const quantity = BigInt(update.tradeQuantity);

  return {
    instrument: update.instrument,
    lastPriceCents: update.priceCents,
    bidCents: update.bidCents,
    askCents: update.askCents,
    bidQuantity: update.bidQuantity,
    askQuantity: update.askQuantity,
    cumulativeVolume: previous.cumulativeVolume + quantity,
    cumulativeNotionalCents: previous.cumulativeNotionalCents + BigInt(update.priceCents) * quantity
  };
}

function calculateSpread({ bidCents, askCents }: InstrumentAccumulator): number | null {
  return bidCents === null || askCents === null ? null : askCents - bidCents;
}

function calculateVwap({ cumulativeVolume, cumulativeNotionalCents }: InstrumentAccumulator): number | null {
  return cumulativeVolume === noVolume ? null : Number(cumulativeNotionalCents) / Number(cumulativeVolume);
}

function calculateImbalance({ bidQuantity, askQuantity }: InstrumentAccumulator): number | null {
  const bookQuantity = bidQuantity + askQuantity;

  return bookQuantity === 0 ? null : (bidQuantity - askQuantity) / bookQuantity;
}

/** Creates a state with zero volume and unavailable values for every instrument. */
export function createMarketMetricsState(instruments: readonly string[] = []): MarketMetricsState {
  return new Map(instruments.map((instrument) => [instrument, createEmptyAccumulator(instrument)]));
}

/** Applies every update exactly once and returns a new immutable state map. */
export function applyMarketUpdates(
  currentState: MarketMetricsState,
  updates: readonly MarketUpdate[]
): MarketMetricsState {
  const nextState = new Map(currentState);

  for (const update of updates) {
    if (!isValidMarketUpdate(update)) {
      throw new RangeError(`Invalid market update for instrument "${update.instrument}".`);
    }

    const previous = nextState.get(update.instrument) ?? createEmptyAccumulator(update.instrument);

    nextState.set(update.instrument, accumulateUpdate(previous, update));
  }

  return nextState;
}

/** Converts internal exact accumulators into values consumed by the UI. */
export function selectInstrumentMetrics(state: MarketMetricsState): readonly InstrumentMetrics[] {
  return [...state.values()].map((item) => ({
    instrument: item.instrument,
    lastPriceCents: item.lastPriceCents,
    spreadCents: calculateSpread(item),
    tradingVolume: item.cumulativeVolume,
    vwapCents: calculateVwap(item),
    orderBookImbalance: calculateImbalance(item)
  }));
}

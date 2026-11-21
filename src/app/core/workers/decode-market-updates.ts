import { createInstrumentSymbol } from '../domain/instrument-symbol';
import type { MarketUpdate } from '../models/market-data.model';

/**
 * Position of each value inside one generator record. A record is a sequence of little-endian u32 values
 * and must match the ABI layout documented in `wasm/market-data-generator/src/lib.rs`.
 */
const recordFieldOffset = {
  instrumentIndex: 0,
  priceCents: 1,
  tradeQuantity: 2,
  bidCents: 3,
  askCents: 4,
  bidQuantity: 5,
  askQuantity: 6
} as const;

export const MARKET_UPDATE_RECORD_FIELD_COUNT = Object.keys(recordFieldOffset).length;
export const MARKET_UPDATE_RECORD_BYTES = MARKET_UPDATE_RECORD_FIELD_COUNT * Uint32Array.BYTES_PER_ELEMENT;

/** Copies `count` records out of Wasm memory into plain objects that can be posted to the main thread. */
export function decodeMarketUpdates(values: Uint32Array, count: number): MarketUpdate[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index * MARKET_UPDATE_RECORD_FIELD_COUNT;

    return {
      instrument: createInstrumentSymbol(values[offset + recordFieldOffset.instrumentIndex]),
      priceCents: values[offset + recordFieldOffset.priceCents],
      tradeQuantity: values[offset + recordFieldOffset.tradeQuantity],
      bidCents: values[offset + recordFieldOffset.bidCents],
      askCents: values[offset + recordFieldOffset.askCents],
      bidQuantity: values[offset + recordFieldOffset.bidQuantity],
      askQuantity: values[offset + recordFieldOffset.askQuantity]
    };
  });
}

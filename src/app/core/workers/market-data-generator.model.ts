import type { MarketUpdate } from '../models/market-data.model';

/** Stateful market-data generator used by the Worker runtime; implemented by the Wasm module. */
export type MarketDataGenerator = {
  /** Resets per-instrument state for a new run. Throws when the generator rejects the configuration. */
  readonly initialize: (seed: bigint, instrumentCount: number) => void;
  /** Returns exactly `count` updates. Throws when generation fails. */
  readonly generateBatch: (count: number) => readonly MarketUpdate[];
}

export type MarketDataGeneratorLoader = (wasmUrl: string) => Promise<MarketDataGenerator>;

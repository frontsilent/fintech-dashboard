import type { MarketUpdateNumericField } from '../models/market-data.model';

/**
 * Ticker symbols assigned to generator instruments by zero-based index: the Greek alphabet
 * in order, followed by extra symbols so every supported instrument count has unique names.
 * Must contain at least `PRODUCER_SETTINGS_LIMITS.instrumentCount.max` unique entries.
 */
export const INSTRUMENT_SYMBOLS = [
  'ALFA', 'BETA', 'GAMMA', 'DELTA', 'EPSILON', 'ZETA', 'ETA', 'THETA', 'IOTA', 'KAPPA',
  'LAMBDA', 'MU', 'NU', 'XI', 'OMICRON', 'PI', 'RHO', 'SIGMA', 'TAU', 'UPSILON',
  'PHI', 'CHI', 'PSI', 'OMEGA',
  'VEGA', 'NOVA', 'APEX', 'ATOM', 'AXIS', 'BOLT', 'BYTE', 'CORE', 'CUBE', 'DAWN',
  'DUNE', 'ECHO', 'EDGE', 'FERN', 'FLUX', 'GLOW', 'GRID', 'HALO', 'HELM', 'IRIS',
  'JADE', 'KILO', 'KITE', 'LIMA', 'LUNA', 'MESA'
] as const;

/** Prices and trade size must be strictly positive safe integers. */
export const MARKET_UPDATE_POSITIVE_FIELDS = [
  'priceCents',
  'tradeQuantity',
  'bidCents',
  'askCents'
] as const satisfies readonly MarketUpdateNumericField[];

/** Order-book depth may be empty but never negative. */
export const MARKET_UPDATE_NON_NEGATIVE_FIELDS = [
  'bidQuantity',
  'askQuantity'
] as const satisfies readonly MarketUpdateNumericField[];

/** Resolved against `document.baseURI`; the file is copied to `public/wasm` by `npm run wasm:build`. */
export const MARKET_DATA_WASM_PATH = 'wasm/market_data_generator.wasm';

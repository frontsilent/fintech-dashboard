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

/** Maps a zero-based generator instrument index to its ticker symbol (`0` → `ALFA`). */
export function createInstrumentSymbol(index: number): string {
  const symbol = INSTRUMENT_SYMBOLS[index];

  if (symbol === undefined) {
    throw new RangeError(`No instrument symbol for index ${index}.`);
  }

  return symbol;
}

export function createInstrumentSymbols(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => createInstrumentSymbol(index));
}

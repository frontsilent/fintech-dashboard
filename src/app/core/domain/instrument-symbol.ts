import { INSTRUMENT_SYMBOL_DIGITS, INSTRUMENT_SYMBOL_PREFIX } from '../constants/market-data.constants';

/** Maps a zero-based generator instrument index to its display symbol (`0` → `ASSET-01`). */
export function createInstrumentSymbol(index: number): string {
  return `${INSTRUMENT_SYMBOL_PREFIX}${String(index + 1).padStart(INSTRUMENT_SYMBOL_DIGITS, '0')}`;
}

export function createInstrumentSymbols(count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => createInstrumentSymbol(index));
}

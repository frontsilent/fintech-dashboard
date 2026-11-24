import { INSTRUMENT_SYMBOLS } from '../constants/market-data.constants';

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

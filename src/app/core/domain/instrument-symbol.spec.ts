import { createInstrumentSymbol, createInstrumentSymbols } from './instrument-symbol';
import { INSTRUMENT_SYMBOLS } from '../constants/market-data.constants';
import { PRODUCER_SETTINGS_LIMITS } from '../constants/producer-settings.constants';

const maxInstruments = PRODUCER_SETTINGS_LIMITS.instrumentCount.max;
const symbolCount = 2;

describe('instrument symbols', () => {
  it('maps zero-based indexes to ticker symbols', () => {
    expect(createInstrumentSymbol(0)).toBe('ALFA');
    expect(createInstrumentSymbol(1)).toBe('BETA');
  });

  it('creates one symbol per instrument', () => {
    expect(createInstrumentSymbols(symbolCount)).toEqual(['ALFA', 'BETA']);
  });

  it('provides a unique symbol for every supported instrument', () => {
    const symbols = createInstrumentSymbols(maxInstruments);

    expect(new Set(symbols).size).toBe(maxInstruments);
    expect(INSTRUMENT_SYMBOLS.length).toBeGreaterThanOrEqual(maxInstruments);
  });

  it('rejects indexes without a symbol', () => {
    expect(() => createInstrumentSymbol(-1)).toThrow(RangeError);
    expect(() => createInstrumentSymbol(INSTRUMENT_SYMBOLS.length)).toThrow(RangeError);
  });
});

import { createInstrumentSymbol, createInstrumentSymbols } from './instrument-symbol';

const lastIndex = 49;
const symbolCount = 2;

describe('instrument symbols', () => {
  it('maps zero-based indexes to padded symbols', () => {
    expect(createInstrumentSymbol(0)).toBe('ASSET-01');
    expect(createInstrumentSymbol(lastIndex)).toBe('ASSET-50');
  });

  it('creates one symbol per instrument', () => {
    expect(createInstrumentSymbols(symbolCount)).toEqual(['ASSET-01', 'ASSET-02']);
  });
});

import { decodeMarketUpdates, MARKET_UPDATE_RECORD_BYTES, MARKET_UPDATE_RECORD_FIELD_COUNT } from './decode-market-updates';

/** Records in ABI field order (property insertion order matches the layout). */
const records = [
  { instrumentIndex: 0, priceCents: 10_200, tradeQuantity: 30, bidCents: 10_196, askCents: 10_200, bidQuantity: 600, askQuantity: 400 },
  { instrumentIndex: 2, priceCents: 9_996, tradeQuantity: 5, bidCents: 9_996, askCents: 10_000, bidQuantity: 12, askQuantity: 0 }
];

const fieldCount = Object.keys(records[0]).length;

describe('decodeMarketUpdates', () => {
  it('describes the 7 x u32 record layout used by the Wasm ABI', () => {
    expect(MARKET_UPDATE_RECORD_FIELD_COUNT).toBe(fieldCount);
    expect(MARKET_UPDATE_RECORD_BYTES).toBe(fieldCount * Uint32Array.BYTES_PER_ELEMENT);
  });

  it('maps records to market updates with instrument symbols', () => {
    const values = Uint32Array.from(records.flatMap((record) => Object.values(record)));

    expect(decodeMarketUpdates(values, records.length)).toEqual([
      {
        instrument: 'ALFA',
        priceCents: 10_200,
        tradeQuantity: 30,
        bidCents: 10_196,
        askCents: 10_200,
        bidQuantity: 600,
        askQuantity: 400
      },
      {
        instrument: 'GAMMA',
        priceCents: 9_996,
        tradeQuantity: 5,
        bidCents: 9_996,
        askCents: 10_000,
        bidQuantity: 12,
        askQuantity: 0
      }
    ]);
  });
});

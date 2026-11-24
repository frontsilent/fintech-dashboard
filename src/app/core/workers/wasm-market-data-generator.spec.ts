import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  decodeMarketUpdates,
  MARKET_UPDATE_RECORD_BYTES,
  MARKET_UPDATE_RECORD_FIELD_COUNT,
  WasmMarketDataGenerator
} from './wasm-market-data-generator';
import { isValidMarketUpdate } from '../utils/market-update';

const wasmPath = resolve(__dirname, '../../../../public/wasm/market_data_generator.wasm');
const seed = 42n;
const instrumentCount = 3;
const batchSize = 250;
const invalidInstrumentCount = 51;

const createGenerator = async (): Promise<WasmMarketDataGenerator> =>
  WasmMarketDataGenerator.instantiateFromBytes(readFileSync(wasmPath));

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

describe('WasmMarketDataGenerator (compiled module)', () => {
  it('returns batches of the requested size with valid updates for configured instruments', async () => {
    const generator = await createGenerator();

    generator.initializeRun(seed, instrumentCount);

    const updates = generator.generateUpdateBatch(batchSize);
    const instruments = new Set(updates.map((update) => update.instrument));

    expect(updates).toHaveLength(batchSize);
    expect(updates.every(isValidMarketUpdate)).toBe(true);
    expect([...instruments].every((symbol) => ['ALFA', 'BETA', 'GAMMA'].includes(symbol))).toBe(true);
  });

  it('is deterministic for the same seed', async () => {
    const first = await createGenerator();
    const second = await createGenerator();

    first.initializeRun(seed, instrumentCount);
    second.initializeRun(seed, instrumentCount);

    expect(first.generateUpdateBatch(batchSize)).toEqual(second.generateUpdateBatch(batchSize));
  });

  it('rejects an unsupported instrument count', async () => {
    const generator = await createGenerator();

    expect(() => generator.initializeRun(seed, invalidInstrumentCount)).toThrow('initialization failed');
  });

  it('rejects modules without the generator ABI', async () => {
    // Smallest valid module: the `\0asm` magic followed by binary format version 1.
    const emptyModule = Uint8Array.from([...new TextEncoder().encode('\0asm'), 1, 0, 0, 0]);

    await expect(WasmMarketDataGenerator.instantiateFromBytes(emptyModule)).rejects.toThrow('expected generator ABI');
  });
});

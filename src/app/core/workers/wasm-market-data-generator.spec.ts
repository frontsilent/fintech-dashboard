import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { WasmMarketDataGenerator } from './wasm-market-data-generator';
import { isValidMarketUpdate } from '../domain/market-update.validation';

const wasmPath = resolve(__dirname, '../../../../public/wasm/market_data_generator.wasm');
const seed = 42n;
const instrumentCount = 3;
const batchSize = 250;
const invalidInstrumentCount = 51;

const createGenerator = async (): Promise<WasmMarketDataGenerator> =>
  WasmMarketDataGenerator.instantiate(readFileSync(wasmPath));

describe('WasmMarketDataGenerator (compiled module)', () => {
  it('returns batches of the requested size with valid updates for configured instruments', async () => {
    const generator = await createGenerator();

    generator.initialize(seed, instrumentCount);

    const updates = generator.generateBatch(batchSize);
    const instruments = new Set(updates.map((update) => update.instrument));

    expect(updates).toHaveLength(batchSize);
    expect(updates.every(isValidMarketUpdate)).toBe(true);
    expect([...instruments].every((symbol) => ['ASSET-01', 'ASSET-02', 'ASSET-03'].includes(symbol))).toBe(true);
  });

  it('is deterministic for the same seed', async () => {
    const first = await createGenerator();
    const second = await createGenerator();

    first.initialize(seed, instrumentCount);
    second.initialize(seed, instrumentCount);

    expect(first.generateBatch(batchSize)).toEqual(second.generateBatch(batchSize));
  });

  it('rejects an unsupported instrument count', async () => {
    const generator = await createGenerator();

    expect(() => generator.initialize(seed, invalidInstrumentCount)).toThrow('initialization failed');
  });

  it('rejects modules without the generator ABI', async () => {
    // Smallest valid module: the `\0asm` magic followed by binary format version 1.
    const emptyModule = Uint8Array.from([...new TextEncoder().encode('\0asm'), 1, 0, 0, 0]);

    await expect(WasmMarketDataGenerator.instantiate(emptyModule)).rejects.toThrow('expected generator ABI');
  });
});

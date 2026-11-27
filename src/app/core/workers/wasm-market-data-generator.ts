import type { MarketDataGenerator, MarketDataGeneratorLoader } from './market-data-worker.runtime';
import type { MarketUpdate } from '../models/market-data.model';
import { createInstrumentSymbol } from '../utils/instrument-symbol';

/** Exports of the Rust crate (`wasm/market-data-generator/src/lib.rs`) in TypeScript naming. */
type GeneratorExports = {
  readonly memory: WebAssembly.Memory;
  readonly init: (seed: bigint, instrumentCount: number) => number;
  readonly allocBuffer: (length: number) => number;
  readonly deallocBuffer: (pointer: number, length: number) => void;
  readonly generateBatch: (count: number, pointer: number, length: number) => number;
};

type GeneratorExportCandidates = { readonly [TName in keyof GeneratorExports]: WebAssembly.ExportValue | undefined };

/** Maps Rust export names to TypeScript names at the Wasm boundary. */
function pickGeneratorExports(exports: WebAssembly.Exports): GeneratorExportCandidates {
  return {
    memory: exports['memory'],
    init: exports['init'],
    allocBuffer: exports['alloc_buffer'],
    deallocBuffer: exports['dealloc_buffer'],
    generateBatch: exports['generate_batch']
  };
}

function hasExpectedExports(candidates: GeneratorExportCandidates): candidates is GeneratorExports {
  const { memory, ...functions } = candidates;

  return memory instanceof WebAssembly.Memory && Object.values(functions).every((value) => typeof value === 'function');
}

const nullPointer = 0;

/**
 * Position of each value inside one generator record. A record is a sequence of little-endian u32 values
 * and must match the ABI layout defined by `MarketRecord::wire_fields` in `wasm/market-data-generator/src/market_record.rs`.
 */
const recordFieldOffset = {
  instrumentIndex: 0,
  priceCents: 1,
  tradeQuantity: 2,
  bidCents: 3,
  askCents: 4,
  bidQuantity: 5,
  askQuantity: 6
} as const;

export const MARKET_UPDATE_RECORD_FIELD_COUNT = Object.keys(recordFieldOffset).length;
export const MARKET_UPDATE_RECORD_BYTES = MARKET_UPDATE_RECORD_FIELD_COUNT * Uint32Array.BYTES_PER_ELEMENT;

/** Copies `count` records out of Wasm memory into plain objects that can be posted to the main thread. */
export function decodeMarketUpdates(values: Uint32Array, count: number): MarketUpdate[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = index * MARKET_UPDATE_RECORD_FIELD_COUNT;

    return {
      instrument: createInstrumentSymbol(values[offset + recordFieldOffset.instrumentIndex]),
      priceCents: values[offset + recordFieldOffset.priceCents],
      tradeQuantity: values[offset + recordFieldOffset.tradeQuantity],
      bidCents: values[offset + recordFieldOffset.bidCents],
      askCents: values[offset + recordFieldOffset.askCents],
      bidQuantity: values[offset + recordFieldOffset.bidQuantity],
      askQuantity: values[offset + recordFieldOffset.askQuantity]
    };
  });
}

export type WasmModuleCompiler = (url: string) => Promise<WebAssembly.Module>;

/** Downloads and compiles the generator module. */
export async function fetchWasmModule(url: string): Promise<WebAssembly.Module> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to load WebAssembly module (${response.status} ${response.statusText}).`);
  }

  return WebAssembly.compile(await response.arrayBuffer());
}

/**
 * Generator loader for the Worker. The module is downloaded and compiled once per URL, so applying settings
 * does not download it again; every run still gets a new instance, and the previous run's memory is released
 * with its instance. A failed load is not cached, so the next run retries it.
 */
export function createCachedWasmGeneratorLoader(
  compileModule: WasmModuleCompiler = fetchWasmModule
): MarketDataGeneratorLoader {
  const compiledModules = new Map<string, Promise<WebAssembly.Module>>();

  return async (url) => {
    const compiledModule = compiledModules.get(url) ?? compileModule(url);

    compiledModules.set(url, compiledModule);

    try {
      return await WasmMarketDataGenerator.instantiate(await compiledModule);
    } catch (error: unknown) {
      if (compiledModules.get(url) === compiledModule) {
        compiledModules.delete(url);
      }

      throw error;
    }
  };
}

/** Adapts the raw Wasm ABI (pointers and buffers) to the `MarketDataGenerator` contract. */
export class WasmMarketDataGenerator implements MarketDataGenerator {
  private readonly exports: GeneratorExports;

  private constructor(exports: GeneratorExports) {
    this.exports = exports;
  }

  /** Creates a new instance, with its own memory and run state, of an already compiled module. */
  static async instantiate(compiledModule: WebAssembly.Module): Promise<WasmMarketDataGenerator> {
    const instance = await WebAssembly.instantiate(compiledModule, {});
    const exports = pickGeneratorExports(instance.exports);

    if (!hasExpectedExports(exports)) {
      throw new Error('WebAssembly module does not expose the expected generator ABI.');
    }

    return new WasmMarketDataGenerator(exports);
  }

  static async instantiateFromBytes(bytes: BufferSource): Promise<WasmMarketDataGenerator> {
    return WasmMarketDataGenerator.instantiate(await WebAssembly.compile(bytes));
  }

  initializeRun(seed: bigint, instrumentCount: number): void {
    if (this.exports.init(seed, instrumentCount) !== instrumentCount) {
      throw new Error('WebAssembly generator initialization failed.');
    }
  }

  generateUpdateBatch(count: number): readonly MarketUpdate[] {
    const byteLength = count * MARKET_UPDATE_RECORD_BYTES;
    const pointer = this.exports.allocBuffer(byteLength);

    if (pointer === nullPointer) {
      throw new Error('Unable to allocate a WebAssembly output buffer.');
    }

    try {
      const generatedCount = this.exports.generateBatch(count, pointer, byteLength);

      if (generatedCount !== count) {
        throw new Error(`Wasm generated ${generatedCount} updates; expected ${count}.`);
      }

      const values = new Uint32Array(this.exports.memory.buffer, pointer, count * MARKET_UPDATE_RECORD_FIELD_COUNT);

      return decodeMarketUpdates(values, count);
    } finally {
      this.exports.deallocBuffer(pointer, byteLength);
    }
  }
}

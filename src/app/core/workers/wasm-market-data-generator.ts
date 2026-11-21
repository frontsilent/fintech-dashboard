import { decodeMarketUpdates, MARKET_UPDATE_RECORD_BYTES, MARKET_UPDATE_RECORD_FIELD_COUNT } from './decode-market-updates';
import type { MarketDataGenerator } from './market-data-generator.model';
import type { MarketUpdate } from '../models/market-data.model';

/** Generator functions in TypeScript naming. */
type GeneratorAbi = {
  readonly init: (seed: bigint, instrumentCount: number) => number;
  readonly allocBuffer: (length: number) => number;
  readonly deallocBuffer: (pointer: number, length: number) => void;
  readonly generateBatch: (count: number, pointer: number, length: number) => number;
}

/** Export names produced by the Rust crate (`wasm/market-data-generator/src/lib.rs`). */
const abiExportNames = {
  init: 'init',
  allocBuffer: 'alloc_buffer',
  deallocBuffer: 'dealloc_buffer',
  generateBatch: 'generate_batch'
} as const satisfies Record<keyof GeneratorAbi, string>;

type GeneratorExports = { readonly memory: WebAssembly.Memory } & {
  readonly [TFunction in keyof GeneratorAbi as (typeof abiExportNames)[TFunction]]: GeneratorAbi[TFunction];
};

const nullPointer = 0;

function hasGeneratorAbi(exports: WebAssembly.Exports): exports is GeneratorExports {
  return exports['memory'] instanceof WebAssembly.Memory
    && Object.values(abiExportNames).every((name) => typeof exports[name] === 'function');
}

/** Adapts the raw Wasm ABI (pointers and buffers) to the `MarketDataGenerator` contract. */
export class WasmMarketDataGenerator implements MarketDataGenerator {
  private readonly exports: GeneratorExports;

  private constructor(exports: GeneratorExports) {
    this.exports = exports;
  }

  static async instantiate(bytes: BufferSource): Promise<WasmMarketDataGenerator> {
    const { instance } = await WebAssembly.instantiate(bytes, {});

    if (!hasGeneratorAbi(instance.exports)) {
      throw new Error('WebAssembly module does not expose the expected generator ABI.');
    }

    return new WasmMarketDataGenerator(instance.exports);
  }

  static async load(url: string): Promise<WasmMarketDataGenerator> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Unable to load WebAssembly module (${response.status} ${response.statusText}).`);
    }

    return WasmMarketDataGenerator.instantiate(await response.arrayBuffer());
  }

  initialize(seed: bigint, instrumentCount: number): void {
    if (this.exports.init(seed, instrumentCount) !== instrumentCount) {
      throw new Error('WebAssembly generator initialization failed.');
    }
  }

  generateBatch(count: number): readonly MarketUpdate[] {
    const byteLength = count * MARKET_UPDATE_RECORD_BYTES;
    const pointer = this.exports.alloc_buffer(byteLength);

    if (pointer === nullPointer) {
      throw new Error('Unable to allocate a WebAssembly output buffer.');
    }

    try {
      const generatedCount = this.exports.generate_batch(count, pointer, byteLength);

      if (generatedCount !== count) {
        throw new Error(`Wasm generated ${generatedCount} updates; expected ${count}.`);
      }

      const values = new Uint32Array(this.exports.memory.buffer, pointer, count * MARKET_UPDATE_RECORD_FIELD_COUNT);

      return decodeMarketUpdates(values, count);
    } finally {
      this.exports.dealloc_buffer(pointer, byteLength);
    }
  }
}

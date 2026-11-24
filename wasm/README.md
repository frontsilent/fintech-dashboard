# Rust / WebAssembly market-data generator

The generator uses a small raw WebAssembly ABI instead of a JS wrapper. The PRNG (xorshift64*),
per-instrument prices, price evolution, trade selection and order-book values are generated in Rust/Wasm.
TypeScript supplies only the run seed and configuration.

## Build

```bash
npm run wasm:build   # also runs automatically before `npm start` and `npm run build`
```

`wasm/build.mjs` installs the `wasm32-unknown-unknown` target if it is missing, builds the crate in release mode and
copies the module to `public/wasm/market_data_generator.wasm`.

## Test

```bash
cargo test --manifest-path wasm/market-data-generator/Cargo.toml
```

Native tests need a host linker (on Windows: Visual Studio Build Tools with the C++ workload). The compiled module is
also exercised from Jest (`src/app/core/workers/wasm-market-data-generator.spec.ts`).

## Price model

Each update picks an instrument uniformly, then moves its price by a random 1–5 cents up or down (a symmetric random
walk reflected at 1.00 USD), so prices always change and have no drift. The trade executes at the
bid or the ask with a spread of 1–20 cents; trade quantity is 1–100 and book quantities are 0–1,000.

## ABI

- `init(seed: u64, instrument_count: u32) -> u32` — starts a run; returns `instrument_count`, or `0` if it is outside `1..=50`.
- `alloc_buffer(length: usize) -> *mut u8` — returns null for `0`.
- `dealloc_buffer(pointer: *mut u8, length: usize)`
- `generate_batch(count: u32, output_pointer: *mut u8, output_length: usize) -> u32` — returns `count`, or `0` when
  no run is active, `count` is outside `1..=1000` or the buffer is too small.

Each record contains seven little-endian `u32` fields (28 bytes): instrument index, price cents, trade quantity,
bid cents, ask cents, bid quantity and ask quantity. The caller must copy the output before releasing the buffer.
`memory` is exported by default for `cdylib` Wasm targets.

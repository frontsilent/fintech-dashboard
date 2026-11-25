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

## Crate layout

| File | Responsibility |
| --- | --- |
| `lib.rs` | WebAssembly exports, global run state, buffer memory management |
| `generator.rs` | Market simulation and price management |
| `market_record.rs` | `MarketRecord` structure and its binary serialization |
| `rng.rs` | Deterministic random number generation (`RandomSource` trait, xorshift64*) |

Each module keeps its unit tests next to it in `<module>_tests.rs` (`lib.rs` → `lib_tests.rs`, `generator.rs` →
`generator_tests.rs`, ...), included as a child module with `#[cfg(test)] #[path = "<module>_tests.rs"] mod tests;`, so
tests can use private items. They are not in `tests/` because the crate is a `cdylib`.

## Test

```bash
npm run wasm:test             # all Rust tests
npm run wasm:test -- price    # tests whose name contains "price"
npm run wasm:lint             # cargo fmt --check + cargo clippy -D warnings
```

`wasm/test.mjs` builds the tests for `wasm32-wasip1` (installing the target if needed) and uses `wasm/wasi-runner.mjs`
as the Cargo runner, which executes the test binary with Node's built-in WASI, so the tests run on the real 32-bit Wasm
architecture.

Wasm cannot unwind, so a panicking test aborts the test binary: the panic message is printed (the script passes
`--nocapture`), the run exits with code `101`, and the remaining tests do not run.

The compiled module is also exercised from Jest (`src/app/core/workers/wasm-market-data-generator.spec.ts`).

## Price model

Each update picks an instrument uniformly, then moves its price by a random 1–5 cents up or down (a symmetric random
walk reflected at 1.00 USD), so prices always change and have no drift. The trade executes at the
bid or the ask with a spread of 1–20 cents; trade quantity is 1–100 and book quantities are 0–1,000.

## ABI

- `init(seed: u64, instrument_count: u32) -> u32` — starts a run; returns `instrument_count`, or `0` if it is outside `1..=50`.
- `alloc_buffer(length: usize) -> *mut u8` — returns a `u32`-aligned buffer, or null for `0` or an oversized length.
- `dealloc_buffer(pointer: *mut u8, length: usize)` — `length` must match the allocation; null is ignored.
- `generate_batch(count: u32, output_pointer: *mut u8, output_length: usize) -> u32` — returns `count`, or `0` when
  no run is active, `count` is outside `1..=1000`, or the buffer is null, misaligned or too small. Nothing is written
  on failure.

Each record contains seven little-endian `u32` fields (28 bytes): instrument index, price cents, trade quantity,
bid cents, ask cents, bid quantity and ask quantity. The caller must copy the output before releasing the buffer.
`memory` is exported by default for `cdylib` Wasm targets.

# Rust / WebAssembly market-data generator

The generator uses a small raw WebAssembly ABI instead of a JS wrapper. The PRNG,
per-instrument price history, price evolution, trade selection and order-book values
are generated in Rust/Wasm. TypeScript supplies only the run seed and configuration.

## Build (Windows PowerShell)

```powershell
./wasm/build.ps1
```

## Build (Linux / macOS / Git Bash)

```bash
./wasm/build.sh
```

The script installs the `wasm32-unknown-unknown` target and copies the compiled
module to `public/wasm/market_data_generator.wasm` for the Angular application.

## ABI

- `init(seed: u64, instrument_count: u32) -> u32`
- `alloc_buffer(length: usize) -> *mut u8`
- `dealloc_buffer(pointer: *mut u8, length: usize)`
- `generate_batch(count: u32, output_pointer: *mut u8, output_length: usize) -> u32`

Each record contains seven little-endian `u32` fields (28 bytes): instrument index,
price cents, trade quantity, bid cents, ask cents, bid quantity and ask quantity.
The caller must copy the output before releasing the Wasm buffer.

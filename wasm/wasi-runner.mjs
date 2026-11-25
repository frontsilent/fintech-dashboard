// Cargo target runner for `wasm32-wasip1`: executes a compiled Rust test binary with Node's built-in WASI.
// Usage (set up by `test.mjs`): node wasi-runner.mjs <test-binary.wasm> [test harness arguments...]
import { readFile } from 'node:fs/promises';
import { WASI } from 'node:wasi';

const [wasmPath, ...args] = process.argv.slice(2);

if (!wasmPath) {
  console.error('Usage: node wasi-runner.mjs <test-binary.wasm> [args...]');
  process.exit(2);
}

/** Exit code `cargo test` uses for failed tests. */
const testFailureExitCode = 101;

const wasi = new WASI({ version: 'preview1', args: [wasmPath, ...args], env: process.env, returnOnExit: true });
const module = await WebAssembly.compile(await readFile(wasmPath));
const instance = await WebAssembly.instantiate(module, wasi.getImportObject());

try {
  process.exitCode = wasi.start(instance);
} catch (error) {
  // Wasm cannot unwind, so a panicking test aborts the whole binary with a trap instead of being reported
  // as one failed test. The panic message was already printed above (`test.mjs` passes `--nocapture`).
  if (!(error instanceof WebAssembly.RuntimeError)) {
    throw error;
  }
  console.error(`\nA test panicked and aborted the test binary (${error.message}); later tests did not run.`);
  process.exitCode = testFailureExitCode;
}

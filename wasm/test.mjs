// Runs the Rust generator tests (run via `npm run wasm:test`; extra arguments are passed to `cargo test`).
//
// The tests are compiled to `wasm32-wasip1` and executed by Node's WASI (`wasi-runner.mjs`), so they run on the
// same 32-bit Wasm architecture as the shipped module (e.g. `usize` is 32 bits).
import { resolve } from 'node:path';

import { ensureTargetInstalled, manifestPath, projectRoot, run } from './cargo.mjs';

const target = 'wasm32-wasip1';
// Forward slashes keep the path valid inside the TOML string below on every platform.
const runnerScript = resolve(projectRoot, 'wasm/wasi-runner.mjs').replaceAll('\\', '/');
// A TOML array, so a project path containing spaces still reaches Node as one argument.
const runner = JSON.stringify(['node', '--no-warnings', runnerScript]);

// Wasm cannot unwind: a panic aborts the test binary before the harness prints captured output, so the panic
// message is only visible with `--nocapture`. Arguments after `--` go to the test harness.
const [cargoArgs, harnessArgs] = splitAtSeparator(process.argv.slice(2));

function splitAtSeparator(args) {
  const separator = args.indexOf('--');

  return separator < 0 ? [args, []] : [args.slice(0, separator), args.slice(separator + 1)];
}

ensureTargetInstalled(target);
run('cargo', [
  'test',
  '--manifest-path',
  manifestPath,
  '--target',
  target,
  '--locked',
  '--config',
  `target.${target}.runner=${runner}`,
  ...cargoArgs,
  '--',
  '--nocapture',
  ...harnessArgs
]);

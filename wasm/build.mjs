// Compiles the Rust generator to WebAssembly and copies it to `public/wasm` (run via `npm run wasm:build`).
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = 'wasm32-unknown-unknown';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateDirectory = resolve(projectRoot, 'wasm/market-data-generator');
const wasmSource = resolve(crateDirectory, `target/${target}/release/market_data_generator.wasm`);
const outputDirectory = resolve(projectRoot, 'public/wasm');
const wasmDestination = resolve(outputDirectory, 'market_data_generator.wasm');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit', ...options });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function ensureTargetInstalled() {
  const installed = run('rustup', ['target', 'list', '--installed'], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

  if (!installed.stdout.split(/\r?\n/).includes(target)) {
    run('rustup', ['target', 'add', target]);
  }
}

ensureTargetInstalled();
run('cargo', ['build', '--manifest-path', resolve(crateDirectory, 'Cargo.toml'), '--target', target, '--release', '--locked']);
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(wasmSource, wasmDestination);
console.log(`Wasm artifact copied to ${relative(projectRoot, wasmDestination)} (${statSync(wasmDestination).size} bytes)`);

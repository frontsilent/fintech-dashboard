import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateManifest = resolve(projectRoot, 'wasm/market-data-generator/Cargo.toml');
const wasmSource = resolve(projectRoot, 'wasm/market-data-generator/target/wasm32-unknown-unknown/release/market_data_generator.wasm');
const outputDirectory = resolve(projectRoot, 'public/wasm');
const wasmDestination = resolve(outputDirectory, 'market_data_generator.wasm');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('rustup', ['target', 'add', 'wasm32-unknown-unknown']);
run('cargo', ['build', '--manifest-path', crateManifest, '--target', 'wasm32-unknown-unknown', '--release']);
mkdirSync(outputDirectory, { recursive: true });
cpSync(wasmSource, wasmDestination);
console.log(`Wasm artifact copied to ${wasmDestination}`);

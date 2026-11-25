// Compiles the Rust generator to WebAssembly and copies it to `public/wasm` (run via `npm run wasm:build`).
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { crateDirectory, ensureTargetInstalled, manifestPath, projectRoot, run } from './cargo.mjs';

const target = 'wasm32-unknown-unknown';
const wasmSource = resolve(crateDirectory, `target/${target}/release/market_data_generator.wasm`);
const outputDirectory = resolve(projectRoot, 'public/wasm');
const wasmDestination = resolve(outputDirectory, 'market_data_generator.wasm');

ensureTargetInstalled(target);
run('cargo', ['build', '--manifest-path', manifestPath, '--target', target, '--release', '--locked']);
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(wasmSource, wasmDestination);
console.log(`Wasm artifact copied to ${relative(projectRoot, wasmDestination)} (${statSync(wasmDestination).size} bytes)`);

// Shared helpers for the Wasm scripts (`build.mjs`, `test.mjs`).
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const crateDirectory = resolve(projectRoot, 'wasm/market-data-generator');
export const manifestPath = resolve(crateDirectory, 'Cargo.toml');

/** Runs a command from the project root and exits with its status code if it fails. */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit', ...options });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

/** Installs a Rust compilation target with rustup if it is missing. */
export function ensureTargetInstalled(target) {
  const installed = run('rustup', ['target', 'list', '--installed'], {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8'
  });

  if (!installed.stdout.split(/\r?\n/).includes(target)) {
    run('rustup', ['target', 'add', target]);
  }
}

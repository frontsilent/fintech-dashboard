#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRATE_DIR="$ROOT_DIR/wasm/market-data-generator"
OUTPUT_DIR="$ROOT_DIR/public/wasm"

rustup target add wasm32-unknown-unknown
cargo build --manifest-path "$CRATE_DIR/Cargo.toml" --target wasm32-unknown-unknown --release
mkdir -p "$OUTPUT_DIR"
cp "$CRATE_DIR/target/wasm32-unknown-unknown/release/market_data_generator.wasm" "$OUTPUT_DIR/market_data_generator.wasm"
echo "Wasm artifact copied to public/wasm/market_data_generator.wasm"

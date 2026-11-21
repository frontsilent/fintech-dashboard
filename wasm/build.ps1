$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$crate = Join-Path $PSScriptRoot 'market-data-generator'
$output = Join-Path $root 'public/wasm'

rustup target add wasm32-unknown-unknown
cargo build --manifest-path (Join-Path $crate 'Cargo.toml') --target wasm32-unknown-unknown --release
New-Item -ItemType Directory -Force -Path $output | Out-Null
Copy-Item (Join-Path $crate 'target/wasm32-unknown-unknown/release/market_data_generator.wasm') (Join-Path $output 'market_data_generator.wasm') -Force
Write-Host 'Wasm artifact copied to public/wasm/market_data_generator.wasm'

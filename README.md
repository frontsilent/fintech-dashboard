# Realtime Fintech Dashboard

Angular 20 standalone application for a realtime market-data simulation.

## Stack

- Angular 20 + TypeScript (strict mode)
- Standalone components and lazy feature routes
- Angular Signals for application state
- Reactive Forms for producer settings
- Rust compiled to WebAssembly for market-data generation
- Native Web Worker for off-main-thread generation
- Jest for unit tests
- SCSS

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+
- Rust toolchain and `wasm32-unknown-unknown` target (for the Wasm phase)

## Getting started

```bash
npm install
npm start
```

The `prestart` and `prebuild` hooks compile the Rust generator to WebAssembly before starting the dev server or creating a production build. You can also run `npm run wasm:build` explicitly.

Open `http://localhost:4200`.

## Tests

```bash
npm test
npm run test:coverage
```

```bash
npm run lint                                          # ESLint, zero warnings allowed
cargo test --manifest-path wasm/market-data-generator/Cargo.toml   # Rust generator tests
```

The Jest suite also runs the compiled `public/wasm/market_data_generator.wasm`
(`wasm-market-data-generator.spec.ts`), so generator batch sizes and value invariants are checked from TypeScript as well.

## Project structure

```
src/app/
  app.*                     Shell (top bar, navigation, footer) and bootstrap config
  core/                     App-wide business code, no UI
    constants/              Default settings, settings limits, status labels
    models/                 Market-data, producer and Worker-protocol types
    utils/                  Pure business rules: metrics, validation, lifecycle, nominal rate, symbols (+ specs)
    services/               MarketDataProducerService (signal-based state service) and MarketDataWorkerService
    workers/                Worker entry, runtime (run lifecycle + scheduling), Wasm adapter with record decoder
  features/                 Routed pages; each feature owns its sub-components and constants
    dashboard/              Producer controls (+ status appearance/control maps), instruments table
    settings/               Settings form factory and field config
  shared/                   Generic, business-agnostic building blocks
    ui/                     page-header, panel, stat-card, alert, status-dot, form-field, detail-list,
                            button[appButton], input[appInput]
    pipes/                  usdCents, integer, signedRatio, numberSign
    validators/             integerRangeValidators + error messages
    utils/                  number ranges, formatting, error messages, typed message dispatch, random seed
src/styles/
  _palette.scss             Colour custom properties (`--app-color-*`)
  _typography.scss          Font family, sizes, weights, line heights (`--app-font-*`, `--app-line-height-*`)
  _sizes.scss               Radii and shared element sizes (`--app-radius-*`, `--app-control-height`, ...)
  _mixins.scss              Breakpoints and shared patterns; `@use 'mixins';` in component styles
  _base.scss, _controls.scss  Global reset/typography and directive-driven control styles
```

Spacing has no variables: margins, paddings and gaps use explicit px values on a 4px scale (`4px`, `8px`, `12px`, `16px`, ...).

### Dependency rules

- `shared` never imports from `core` or `features`.
- Placement is decided by what code knows, not by who uses it: code that knows app concepts (market updates,
  instruments, producer, runs) goes to `core`; code that could be copied unchanged into another project goes to
  `shared`, even if only `core` uses it.
- `models` holds types only; a type that exists to describe one function's input stays next to that function.
- `core/utils` and `core/workers` stay free of Angular and the DOM so the Worker bundle can use them.
- `features` may import `core` and `shared`, never another feature.
- Value-to-config mappings use typed lookup objects (`as const satisfies Record<…>`) instead of `switch`.

## Architecture notes

- `MarketDataProducerService` is a root singleton started by `provideAppInitializer`, so the simulation starts with
  the defaults and navigation never creates another producer or loses the running/paused state.
- Every run has an id; results and acknowledgements from a previous run are ignored on both sides of the Worker boundary.
- The Worker is created through the `MARKET_DATA_WORKER_FACTORY` token (`provideMarketDataWorker()`), which unit
  tests replace with a fake.
- Exact accumulators use `BigInt`; prices are integer cents and are rounded only for display.

/// <reference lib="webworker" />

import { MarketDataWorkerRuntime } from './market-data-worker.runtime';
import { WasmMarketDataGenerator } from './wasm-market-data-generator';
import type { MainToWorkerMessage, WorkerToMainMessage } from '../models/worker-message.model';

const runtime = new MarketDataWorkerRuntime({
  post: (message: WorkerToMainMessage) => postMessage(message),
  loadGenerator: async (wasmUrl) => WasmMarketDataGenerator.load(wasmUrl)
});

addEventListener('message', (event: MessageEvent<MainToWorkerMessage>) => runtime.handle(event.data));

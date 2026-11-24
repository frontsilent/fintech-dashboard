/// <reference lib="webworker" />

import { MarketDataWorkerRuntime } from './market-data-worker.runtime';
import { WasmMarketDataGenerator } from './wasm-market-data-generator';
import type { MainToWorkerMessage, WorkerToMainMessage } from '../models/worker-message.model';

const runtime = new MarketDataWorkerRuntime({
  postToMainThread: (message: WorkerToMainMessage) => postMessage(message),
  loadGenerator: async (wasmUrl) => WasmMarketDataGenerator.loadFromUrl(wasmUrl)
});

addEventListener('message', (event: MessageEvent<MainToWorkerMessage>) => runtime.handleMainThreadMessage(event.data));

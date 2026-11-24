/// <reference lib="webworker" />

import { MarketDataWorkerRuntime } from './market-data-worker.runtime';
import { WasmMarketDataGenerator } from './wasm-market-data-generator';
import type { WorkerCommand, WorkerEvent } from '../models/worker-message.model';

const runtime = new MarketDataWorkerRuntime({
  postToMainThread: (message: WorkerEvent) => postMessage(message),
  loadGenerator: async (wasmUrl) => WasmMarketDataGenerator.loadFromUrl(wasmUrl)
});

addEventListener('message', (event: MessageEvent<WorkerCommand>) => runtime.handleMainThreadMessage(event.data));

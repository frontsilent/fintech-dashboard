import { InjectionToken } from '@angular/core';

/** Creates the market-data Worker. Provided by `provideMarketDataWorker()`; replaced by a fake in unit tests. */
export const MARKET_DATA_WORKER_FACTORY = new InjectionToken<() => Worker>('Market data worker factory');

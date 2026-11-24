import type { Provider } from '@angular/core';

import { MARKET_DATA_WORKER_FACTORY } from './market-data-worker.token';

/**
 * Kept separate from the token so unit tests never compile `import.meta.url`,
 * which the Angular builder needs to bundle the Worker.
 */
export function provideMarketDataWorker(): Provider {
  return {
    provide: MARKET_DATA_WORKER_FACTORY,
    useValue: () => new Worker(new URL('../workers/market-data.worker', import.meta.url), { type: 'module' })
  };
}

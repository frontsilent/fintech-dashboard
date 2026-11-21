import { type ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { ROUTES } from './app.routes';
import { MarketDataProducerStore } from './core/services/market-data-producer.store';
import { provideMarketDataWorker } from './core/services/market-data-worker.providers';

export const APP_CONFIG: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(ROUTES, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideMarketDataWorker(),
    // The application starts with the default settings, independent of the initial route.
    provideAppInitializer(() => inject(MarketDataProducerStore).start())
  ]
};

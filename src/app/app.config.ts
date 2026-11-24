import { type ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { ROUTES } from './app.routes';
import { MarketDataProducerService } from './core/services/market-data-producer.service';
import { provideMarketDataWorker } from './core/services/market-data-worker.provider';

export const APP_CONFIG: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(ROUTES, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideMarketDataWorker(),
    // The application starts with the default settings, independent of the initial route.
    provideAppInitializer(() => inject(MarketDataProducerService).start())
  ]
};

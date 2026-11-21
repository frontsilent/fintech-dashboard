import type { ProducerSettings } from './producer-settings.model';

export type ProducerStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'error';

export type ProducerSnapshot = {
  readonly runId: number;
  readonly status: ProducerStatus;
  readonly settings: ProducerSettings;
}

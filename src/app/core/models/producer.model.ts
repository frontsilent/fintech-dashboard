export type ProducerSettings = {
  readonly instrumentCount: number;
  readonly updatesPerBatch: number;
  readonly batchIntervalMs: number;
};

export type ProducerSettingsField = keyof ProducerSettings;

export type ProducerStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'error';

export type ProducerSnapshot = {
  readonly runId: number;
  readonly status: ProducerStatus;
  readonly settings: ProducerSettings;
};

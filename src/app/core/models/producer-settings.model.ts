export type ProducerSettings = {
  readonly instrumentCount: number;
  readonly updatesPerBatch: number;
  readonly batchIntervalMs: number;
}

export type ProducerSettingsField = keyof ProducerSettings;


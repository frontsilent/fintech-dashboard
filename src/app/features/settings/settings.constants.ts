import type { ProducerSettingsField } from '../../core/models/producer-settings.model';

export type SettingsFieldConfig = {
  readonly key: ProducerSettingsField;
  readonly label: string;
  readonly description: string;
  readonly unit: string;
}

export const SETTINGS_FIELDS: readonly SettingsFieldConfig[] = [
  {
    key: 'instrumentCount',
    label: 'Instrument count',
    description: 'How many independent market instruments the producer should simulate.',
    unit: 'instruments'
  },
  {
    key: 'updatesPerBatch',
    label: 'Updates per batch',
    description: 'The exact number of trade updates generated in each batch across all instruments.',
    unit: 'updates'
  },
  {
    key: 'batchIntervalMs',
    label: 'Batch interval',
    description: 'Time between the completion of one batch and the start of the next.',
    unit: 'milliseconds'
  }
];

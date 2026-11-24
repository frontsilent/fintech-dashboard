import { FormControl, FormGroup } from '@angular/forms';

import { PRODUCER_SETTINGS_FIELDS, PRODUCER_SETTINGS_LIMITS } from '../../core/constants/producer.constants';
import type { ProducerSettings, ProducerSettingsField } from '../../core/models/producer.model';
import { integerRangeValidators } from '../../shared/validators/integer-range.validators';

type ProducerSettingsControls = { [TField in ProducerSettingsField]: FormControl<number> };

export type ProducerSettingsForm = FormGroup<ProducerSettingsControls>;

export type SettingsFieldConfig = {
  readonly key: ProducerSettingsField;
  readonly label: string;
  readonly description: string;
  readonly unit: string;
}

/** Display metadata of each form field, in the order the fields are rendered. */
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

function createSettingControl(value: number, field: ProducerSettingsField): FormControl<number> {
  return new FormControl(value, {
    nonNullable: true,
    validators: integerRangeValidators(PRODUCER_SETTINGS_LIMITS[field])
  });
}

/**
 * Reactive form for producer settings, built from `PRODUCER_SETTINGS_FIELDS`, so a new setting
 * needs no change here. The limits come from the same constants as `core/utils/producer-settings.ts`.
 */
export function createProducerSettingsForm(settings: ProducerSettings): ProducerSettingsForm {
  const controls = Object.fromEntries(
    PRODUCER_SETTINGS_FIELDS.map((field) => [field, createSettingControl(settings[field], field)])
  ) as ProducerSettingsControls;

  return new FormGroup(controls);
}

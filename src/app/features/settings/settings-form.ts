import { FormControl, FormGroup } from '@angular/forms';

import { PRODUCER_SETTINGS_LIMITS } from '../../core/constants/producer-settings.constants';
import type { ProducerSettings, ProducerSettingsField } from '../../core/models/producer-settings.model';
import { integerRangeValidators } from '../../shared/validators/integer-range.validators';

export type ProducerSettingsForm = FormGroup<{ [TField in ProducerSettingsField]: FormControl<number> }>;

function createSettingControl(value: number, field: ProducerSettingsField): FormControl<number> {
  return new FormControl(value, {
    nonNullable: true,
    validators: integerRangeValidators(PRODUCER_SETTINGS_LIMITS[field])
  });
}

/** Reactive form for producer settings; the limits come from the same constants as the domain validation. */
export function createProducerSettingsForm(settings: ProducerSettings): ProducerSettingsForm {
  return new FormGroup({
    instrumentCount: createSettingControl(settings.instrumentCount, 'instrumentCount'),
    updatesPerBatch: createSettingControl(settings.updatesPerBatch, 'updatesPerBatch'),
    batchIntervalMs: createSettingControl(settings.batchIntervalMs, 'batchIntervalMs')
  });
}

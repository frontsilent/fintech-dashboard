import { FormControl, FormGroup } from '@angular/forms';

import { PRODUCER_SETTINGS_FIELDS, PRODUCER_SETTINGS_LIMITS } from '../../core/constants/producer-settings.constants';
import type { ProducerSettings, ProducerSettingsField } from '../../core/models/producer-settings.model';
import { integerRangeValidators } from '../../shared/validators/integer-range.validators';

type ProducerSettingsControls = { [TField in ProducerSettingsField]: FormControl<number> };

export type ProducerSettingsForm = FormGroup<ProducerSettingsControls>;

function createSettingControl(value: number, field: ProducerSettingsField): FormControl<number> {
  return new FormControl(value, {
    nonNullable: true,
    validators: integerRangeValidators(PRODUCER_SETTINGS_LIMITS[field])
  });
}

/**
 * Reactive form for producer settings, built from `PRODUCER_SETTINGS_FIELDS`, so a new setting
 * needs no change here. The limits come from the same constants as the domain validation.
 */
export function createProducerSettingsForm(settings: ProducerSettings): ProducerSettingsForm {
  const controls = Object.fromEntries(
    PRODUCER_SETTINGS_FIELDS.map((field) => [field, createSettingControl(settings[field], field)])
  ) as ProducerSettingsControls;

  return new FormGroup(controls);
}

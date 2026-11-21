import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { createProducerSettingsForm } from './settings-form';
import { SETTINGS_FIELDS } from './settings.constants';
import { PRODUCER_SETTINGS_LIMITS } from '../../core/constants/producer-settings.constants';
import { PRODUCER_STATUS_LABELS } from '../../core/constants/producer-status.constants';
import { calculateNominalUpdatesPerSecond } from '../../core/domain/nominal-rate';
import type { ProducerSettingsField } from '../../core/models/producer-settings.model';
import { MarketDataProducerStore } from '../../core/services/market-data-producer.store';
import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { type DetailItem, DetailListComponent } from '../../shared/ui/detail-list/detail-list.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputDirective } from '../../shared/ui/input/input.directive';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { getErrorMessage } from '../../shared/utils/get-error-message';
import { formatDecimal } from '../../shared/utils/number-format';
import { getIntegerRangeErrorMessage } from '../../shared/validators/integer-range.validators';

const rateFractionDigits = 2;

@Component({
  selector: 'app-settings',
  imports: [
    AlertComponent,
    ButtonDirective,
    DecimalPipe,
    DetailListComponent,
    FormFieldComponent,
    InputDirective,
    PageHeaderComponent,
    PanelComponent,
    ReactiveFormsModule
  ],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly producer = inject(MarketDataProducerStore);
  private readonly submitted = signal(false);

  readonly fields = SETTINGS_FIELDS;
  readonly limits = PRODUCER_SETTINGS_LIMITS;
  readonly appliedRunId = signal<number | null>(null);
  readonly applyError = signal<string | null>(null);
  /** Editing the form never touches the running producer; only `applySettings()` does. */
  readonly form = createProducerSettingsForm(this.producer.settings());

  readonly nominalRatePreview = toSignal(
    this.form.valueChanges.pipe(map(() => calculateNominalUpdatesPerSecond(this.form.getRawValue()))),
    { initialValue: calculateNominalUpdatesPerSecond(this.form.getRawValue()) }
  );

  readonly activeRunDetails = computed<readonly DetailItem[]>(() => {
    const { instrumentCount, updatesPerBatch, batchIntervalMs } = this.producer.settings();

    return [
      { label: 'Run ID', value: `#${this.producer.runId()}` },
      { label: 'Status', value: PRODUCER_STATUS_LABELS[this.producer.status()] },
      { label: 'Instruments', value: instrumentCount },
      { label: 'Updates / batch', value: updatesPerBatch },
      { label: 'Interval', value: `${batchIntervalMs} ms` },
      {
        label: 'Nominal rate',
        value: `${formatDecimal(this.producer.nominalUpdatesPerSecond(), rateFractionDigits)} / sec`
      }
    ];
  });

  /** Error message for a field once the user has edited it or tried to submit; otherwise `null`. */
  fieldError(field: ProducerSettingsField): string | null {
    const control = this.form.controls[field];
    const isVisible = control.invalid && (control.dirty || this.submitted());

    return isVisible ? getIntegerRangeErrorMessage(control.errors, this.limits[field]) : null;
  }

  resetForm(): void {
    this.form.reset(this.producer.settings());
    this.clearFeedback();
  }

  applySettings(): void {
    this.clearFeedback();
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    try {
      this.appliedRunId.set(this.producer.applySettings(this.form.getRawValue()));
      this.form.markAsPristine();
      this.submitted.set(false);
    } catch (error: unknown) {
      this.applyError.set(getErrorMessage(error, 'Unable to apply producer settings.'));
    }
  }

  private clearFeedback(): void {
    this.submitted.set(false);
    this.appliedRunId.set(null);
    this.applyError.set(null);
  }
}

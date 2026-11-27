import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';

import { createProducerSettingsForm, SETTINGS_FIELDS } from './settings-form';
import { PRODUCER_SETTINGS_LIMITS, PRODUCER_STATUS_LABELS } from '../../core/constants/producer.constants';
import type { ProducerSettingsField, ProducerStatus } from '../../core/models/producer.model';
import { MarketDataProducerService } from '../../core/services/market-data-producer.service';
import { areProducerSettingsEqual, calculateNominalUpdatesPerSecond } from '../../core/utils/producer-settings';
import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { ButtonDirective } from '../../shared/ui/button/button.directive';
import { type DetailItem, DetailListComponent } from '../../shared/ui/detail-list/detail-list.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputDirective } from '../../shared/ui/input/input.directive';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../shared/ui/panel/panel.component';
import { formatDecimal } from '../../shared/utils/number-format';
import { getIntegerRangeErrorMessage } from '../../shared/validators/integer-range.validators';

const rateFractionDigits = 2;

/** Statuses in which Apply restarts the run even with unchanged settings. */
const restartableStatuses: ReadonlySet<ProducerStatus> = new Set(['paused', 'error']);

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
  private readonly producer = inject(MarketDataProducerService);
  private readonly submitted = signal(false);

  readonly fields = SETTINGS_FIELDS;
  readonly limits = PRODUCER_SETTINGS_LIMITS;
  readonly appliedRunId = signal<number | null>(null);
  /** Failures of the active run (Worker or Wasm), reported by the producer. */
  readonly producerError = this.producer.error;
  /** Editing the form never touches the running producer; only `applySettings()` does. */
  readonly form = createProducerSettingsForm(this.producer.settings());

  readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue()
  });

  readonly nominalRatePreview = computed(() => calculateNominalUpdatesPerSecond(this.formValue()));

  /**
   * Unchanged settings would only restart a live run, so Apply then stays disabled. A paused or failed run
   * may always be restarted, even with the same settings.
   */
  readonly canApply = computed(
    () =>
      restartableStatuses.has(this.producer.status()) ||
      !areProducerSettingsEqual(this.formValue(), this.producer.settings())
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

  applySettings(): void {
    // The button is disabled in this case, but Enter a field still submits the form.
    if (!this.canApply()) {
      return;
    }

    this.clearFeedback();
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.appliedRunId.set(this.producer.restart(this.form.getRawValue()));
    this.form.markAsPristine();
    this.submitted.set(false);
  }

  private clearFeedback(): void {
    this.submitted.set(false);
    this.appliedRunId.set(null);
  }
}

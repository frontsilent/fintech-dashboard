import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PRODUCER_STATUS_LABELS } from '../../../core/constants/producer.constants';
import type { ProducerStatus } from '../../../core/models/producer.model';
import { MarketDataProducerService } from '../../../core/services/market-data-producer.service';
import { type ButtonAppearance, ButtonDirective } from '../../../shared/ui/button/button.directive';
import { type StatusAppearance, StatusDotComponent } from '../../../shared/ui/status-dot/status-dot.component';

type ProducerAction = 'pause' | 'resume';

type ProducerControl = {
  readonly label: string;
  readonly appearance: ButtonAppearance;
  /** `null` renders a disabled button. */
  readonly action: ProducerAction | null;
};

const statusAppearance = {
  idle: 'neutral',
  initializing: 'neutral',
  running: 'success',
  paused: 'warning',
  error: 'error'
} as const satisfies Record<ProducerStatus, StatusAppearance>;

/** Control shown for each producer status; `null` hides the control. */
const controlByStatus = {
  idle: null,
  initializing: { label: 'Starting…', appearance: 'secondary', action: null },
  running: { label: 'Pause', appearance: 'secondary', action: 'pause' },
  paused: { label: 'Resume', appearance: 'primary', action: 'resume' },
  error: null
} as const satisfies Record<ProducerStatus, ProducerControl | null>;

/** Producer status indicator with the Pause/Resume control. */
@Component({
  selector: 'app-producer-controls',
  imports: [ButtonDirective, StatusDotComponent],
  template: `
    <span class="indicator" role="status">
      <app-status-dot [appearance]="statusAppearance()" />
      {{ statusLabel() }}
    </span>
    @if (control(); as control) {
      <button
        appButton
        type="button"
        [appearance]="control.appearance"
        [disabled]="!control.action"
        (click)="run(control.action)"
      >
        {{ control.label }}
      </button>
    }
  `,
  styleUrl: 'producer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProducerControlsComponent {
  private readonly producer = inject(MarketDataProducerService);
  private readonly actions: Record<ProducerAction, () => void> = {
    pause: () => this.producer.pause(),
    resume: () => this.producer.resume()
  };

  readonly statusLabel = computed(() => PRODUCER_STATUS_LABELS[this.producer.status()]);
  readonly statusAppearance = computed(() => statusAppearance[this.producer.status()]);
  readonly control = computed<ProducerControl | null>(() => controlByStatus[this.producer.status()]);

  run(action: ProducerAction | null): void {
    if (action) {
      this.actions[action]();
    }
  }
}

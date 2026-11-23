import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  PRODUCER_CONTROL_BY_STATUS,
  PRODUCER_STATUS_APPEARANCE,
  type ProducerAction,
  type ProducerControl
} from './producer-controls.constants';
import { PRODUCER_STATUS_LABELS } from '../../../core/constants/producer-status.constants';
import { MarketDataProducerStore } from '../../../core/services/market-data-producer.store';
import { ButtonDirective } from '../../../shared/ui/button/button.directive';
import { StatusDotComponent } from '../../../shared/ui/status-dot/status-dot.component';

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
      <button appButton type="button" [appearance]="control.appearance" [disabled]="!control.action" (click)="run(control.action)">
        {{ control.label }}
      </button>
    }
  `,
  styleUrl: 'producer-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProducerControlsComponent {
  private readonly producer = inject(MarketDataProducerStore);
  private readonly actions: Record<ProducerAction, () => void> = {
    pause: () => this.producer.pause(),
    resume: () => this.producer.resume()
  };

  readonly statusLabel = computed(() => PRODUCER_STATUS_LABELS[this.producer.status()]);
  readonly statusAppearance = computed(() => PRODUCER_STATUS_APPEARANCE[this.producer.status()]);
  readonly control = computed<ProducerControl | null>(() => PRODUCER_CONTROL_BY_STATUS[this.producer.status()]);

  run(action: ProducerAction | null): void {
    if (action) {
      this.actions[action]();
    }
  }
}

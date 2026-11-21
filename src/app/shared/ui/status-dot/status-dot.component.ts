import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { StatusAppearance } from './status-appearance.type';

@Component({
  selector: 'app-status-dot',
  template: '',
  styleUrl: 'status-dot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class]': '"_" + appearance()'
  }
})
export class StatusDotComponent {
  readonly appearance = input<StatusAppearance>('neutral');
}

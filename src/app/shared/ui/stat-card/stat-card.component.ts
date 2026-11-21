import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <span class="label">{{ label() }}</span>
    <strong class="value">
      {{ value() }}
      @if (unit(); as unit) {
        <small>{{ unit }}</small>
      }
    </strong>
    <span class="hint">{{ hint() }}</span>
  `,
  styleUrl: 'stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>();
  readonly hint = input.required<string>();
}

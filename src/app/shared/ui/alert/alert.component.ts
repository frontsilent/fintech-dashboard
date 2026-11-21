import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AlertAppearance = 'error' | 'success' | 'info';

/** Errors are announced assertively; success and info messages politely. */
const roleByAppearance = {
  error: 'alert',
  success: 'status',
  info: 'note'
} as const satisfies Record<AlertAppearance, string>;

@Component({
  selector: 'app-alert',
  template: `
    @if (appearance() === 'info') {
      <span class="mark" aria-hidden="true">i</span>
    }
    <div>
      @if (heading(); as heading) {
        <strong class="heading">{{ heading }}</strong>
      }
      <ng-content />
    </div>
  `,
  styleUrl: 'alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"_" + appearance()',
    '[attr.role]': 'role()'
  }
})
export class AlertComponent {
  readonly appearance = input.required<AlertAppearance>();
  readonly heading = input<string>();
  readonly role = computed(() => roleByAppearance[this.appearance()]);
}

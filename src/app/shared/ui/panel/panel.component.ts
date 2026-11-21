import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Surface with a heading block. Content marked with `panelAside` is placed next to the heading;
 * the remaining content forms the body. `flush` removes body padding for edge-to-edge content such as tables.
 */
@Component({
  selector: 'app-panel',
  template: `
    <header class="header">
      <div>
        @if (eyebrow(); as eyebrow) {
          <p class="eyebrow">{{ eyebrow }}</p>
        }
        <h2>{{ heading() }}</h2>
        @if (description(); as description) {
          <p class="description">{{ description }}</p>
        }
      </div>
      <ng-content select="[panelAside]" />
    </header>
    <div class="body"><ng-content /></div>
  `,
  styleUrl: 'panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class._flush]': 'flush()' }
})
export class PanelComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>();
  readonly description = input<string>();
  readonly flush = input(false);
}

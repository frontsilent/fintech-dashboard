import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title block; projected content is rendered as page-level actions. */
@Component({
  selector: 'app-page-header',
  template: `
    <div>
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1>{{ heading() }}</h1>
      <p class="description">{{ description() }}</p>
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styleUrl: 'page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}

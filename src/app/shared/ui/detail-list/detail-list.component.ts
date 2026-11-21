import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type DetailItem = {
  readonly label: string;
  readonly value: string | number;
}

/** Label/value rows, e.g. a read-only summary of the active configuration. */
@Component({
  selector: 'app-detail-list',
  template: `
    <dl>
      @for (item of items(); track item.label) {
        <div class="row">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      }
    </dl>
  `,
  styleUrl: 'detail-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailListComponent {
  readonly items = input.required<readonly DetailItem[]>();
}

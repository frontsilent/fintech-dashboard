import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Label, hint, description and error around a projected `input[appInput]`.
 * `controlId` must match the projected input's `id` so the label is associated with it.
 */
@Component({
  selector: 'app-form-field',
  template: `
    <div class="heading">
      <label [for]="controlId()">{{ label() }}</label>
      @if (hint(); as hint) {
        <span class="hint">{{ hint }}</span>
      }
    </div>
    @if (description(); as description) {
      <p class="description">{{ description }}</p>
    }
    <div class="control">
      <ng-content />
      @if (suffix(); as suffix) {
        <span class="suffix">{{ suffix }}</span>
      }
    </div>
    @if (error(); as error) {
      <span class="error" role="alert">{{ error }}</span>
    }
  `,
  styleUrl: 'form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class._invalid]': 'error() !== null' }
})
export class FormFieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly description = input<string>();
  readonly suffix = input<string>();
  /** Message to show; `null` hides the error. */
  readonly error = input<string | null>(null);
}

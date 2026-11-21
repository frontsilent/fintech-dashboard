import { Directive, input } from '@angular/core';

export type ButtonAppearance = 'primary' | 'secondary';

/** Applies the design-system button style (see `src/styles/_controls.scss`). */
@Directive({
  selector: 'button[appButton]',
  host: {
    class: 'app-button',
    '[class._primary]': 'appearance() === "primary"'
  }
})
export class ButtonDirective {
  readonly appearance = input<ButtonAppearance>('secondary');
}

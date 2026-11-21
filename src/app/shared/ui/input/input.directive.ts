import { Directive } from '@angular/core';

/** Applies the design-system input style (see `src/styles/_controls.scss`); use inside `app-form-field`. */
@Directive({
  selector: 'input[appInput]',
  host: { class: 'app-input' }
})
export class InputDirective {}

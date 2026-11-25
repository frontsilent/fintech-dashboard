import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { StatusDotComponent } from './shared/ui/status-dot/status-dot.component';

type NavigationItem = {
  readonly path: string;
  readonly label: string;
};

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StatusDotComponent],
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  readonly navigation: readonly NavigationItem[] = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/settings', label: 'Settings' }
  ];
}

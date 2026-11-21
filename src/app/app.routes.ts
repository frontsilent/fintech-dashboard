import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: async () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'settings',
    loadComponent: async () => import('./features/settings/settings.component').then((m) => m.SettingsComponent)
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' }
];

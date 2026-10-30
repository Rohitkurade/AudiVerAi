import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="auth-page">
      <section class="login-panel forbidden-panel">
        <a class="auth-brand" routerLink="/dashboard">
          <span class="auth-brand-mark" aria-hidden="true">403</span>
          <span><strong>AudiVerAI</strong><small>ASSURANCE PLATFORM</small></span>
        </a>
        <span class="login-eyebrow">ACCESS RESTRICTED</span>
        <h1>You don’t have access to this page</h1>
        <p>Your current role does not include the permission required for this area.</p>
        <a class="login-submit forbidden-link" routerLink="/dashboard">Return to workspace</a>
        <button class="forbidden-signout" type="button" (click)="logout()">Sign out</button>
      </section>
    </main>
  `
})
export class ForbiddenPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/auth.guards';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html'
})
export class LoginPage {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly passwordVisible = signal(false);
  readonly submitting = signal(false);
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)]
    })
  });
  readonly loginError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.loginError.set(null);
    this.auth.clearError();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.login(this.form.getRawValue());
      const returnUrl = safeReturnUrl(
        this.router,
        this.route.snapshot.queryParamMap.get('returnUrl')
      );
      this.form.reset();
      await this.router.navigateByUrl(returnUrl);
    } catch (error: unknown) {
      this.loginError.set(this.messageFor(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return 'Unable to sign in with those details. Check your email and password or contact your administrator.';
      }
      if (error.status === 403) {
        return 'This sign-in request could not be verified. Refresh the page and try again.';
      }
      if (error.status === 429) {
        return 'Too many sign-in attempts. Wait a minute before trying again.';
      }
      if (error.status === 0 || error.status >= 500) {
        return 'The authentication service is unavailable. Try again shortly.';
      }
    }
    return 'Sign-in failed. Please try again.';
  }
}

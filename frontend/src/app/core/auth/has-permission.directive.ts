import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

import { AuthService } from './auth.service';
import { PermissionCode } from './auth.models';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  readonly permissions = input.required<PermissionCode | readonly PermissionCode[]>({
    alias: 'appHasPermission'
  });
  readonly mode = input<'any' | 'all'>('any', { alias: 'appHasPermissionMode' });

  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private visible = false;

  constructor() {
    effect(() => {
      const permissions = this.permissions();
      const allowed = this.mode() === 'all'
        ? this.auth.hasAllPermissions(Array.isArray(permissions) ? permissions : [permissions])
        : this.auth.hasAnyPermission(Array.isArray(permissions) ? permissions : [permissions]);

      if (allowed && !this.visible) {
        this.viewContainer.createEmbeddedView(this.template);
        this.visible = true;
      } else if (!allowed && this.visible) {
        this.viewContainer.clear();
        this.visible = false;
      }
    });
  }
}

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AuthUser, PERMISSIONS, PermissionCode } from './auth.models';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `
    <span *appHasPermission="permission">Allowed navigation</span>
  `
})
class PermissionHost {
  readonly permission = PERMISSIONS.EVIDENCE_VIEW;
}

describe('HasPermissionDirective', () => {
  const user = signal<AuthUser | null>(null);
  let fixture: ComponentFixture<PermissionHost>;

  it('hides an item without permission and reveals it when permission is granted', async () => {
    TestBed.configureTestingModule({
      imports: [PermissionHost],
      providers: [{
        provide: AuthService,
        useValue: {
          hasPermission: (permission: PermissionCode) => user()?.permissions.includes(permission),
          hasAnyPermission: (permissions: readonly PermissionCode[]) =>
            permissions.some((permission) => user()?.permissions.includes(permission)),
          hasAllPermissions: (permissions: readonly PermissionCode[]) =>
            permissions.every((permission) => user()?.permissions.includes(permission))
        }
      }]
    });
    fixture = TestBed.createComponent(PermissionHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Allowed navigation');

    user.set({
      id: '2',
      fullName: 'Avery Reviewer',
      email: 'avery@example.com',
      status: 'ACTIVE',
      department: null,
      roles: ['AUDITOR'],
      permissions: [PERMISSIONS.EVIDENCE_VIEW]
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Allowed navigation');
  });
});

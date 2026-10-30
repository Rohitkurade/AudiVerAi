import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { App } from './app';
import { AuthUser, PERMISSIONS, PermissionCode } from './core/auth/auth.models';
import { AuthService } from './core/auth/auth.service';
import { DemoDataService } from './core/demo-data.service';

describe('App navigation visibility', () => {
  it('shows only navigation available to the authenticated user', () => {
    const user = signal<AuthUser | null>({
      id: '21',
      fullName: 'Casey Auditee',
      email: 'casey@example.com',
      status: 'ACTIVE',
      department: 'Finance',
      roles: ['AUDITEE'],
      permissions: [PERMISSIONS.EVIDENCE_VIEW]
    });
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user,
            status: signal<'authenticated' | 'anonymous' | 'loading'>('authenticated'),
            hasAnyPermission: (permissions: readonly PermissionCode[]) =>
              permissions.some((permission) => user()?.permissions.includes(permission))
          }
        },
        {
          provide: DemoDataService,
          useValue: {
            audits: signal([]),
            openFindingsCount: () => 0,
            notice: signal(null),
            clearNotice: () => undefined
          }
        }
      ]
    });

    const fixture: ComponentFixture<App> = TestBed.createComponent(App);
    fixture.detectChanges();
    const navigationText = fixture.nativeElement.querySelector('.primary-nav')?.textContent ?? '';

    expect(navigationText).toContain('Evidence');
    expect(navigationText).not.toContain('Audits');
    expect(navigationText).not.toContain('Findings');
    expect(fixture.nativeElement.textContent).toContain('AI Copilot');
  });
});

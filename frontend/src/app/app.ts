import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AuthService } from './core/auth/auth.service';
import { PERMISSIONS, PermissionCode } from './core/auth/auth.models';
import { DemoDataService } from './core/demo-data.service';

interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  permissions?: readonly PermissionCode[];
  badge?: 'audits' | 'findings';
  beta?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  readonly demo = inject(DemoDataService);
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly standaloneRoute = signal(this.isStandaloneRoute(inject(Router).url));
  readonly permissions = PERMISSIONS;
  readonly navigationGroups: NavigationGroup[] = [
    {
      label: 'WORKSPACE',
      items: [
        {
          label: 'Overview',
          route: '/dashboard',
          icon: '⌂',
          permissions: [PERMISSIONS.AUDITS_VIEW_ALL, PERMISSIONS.AUDITS_VIEW_ASSIGNED]
        },
        {
          label: 'Audits',
          route: '/audits',
          icon: '▤',
          permissions: [PERMISSIONS.AUDITS_VIEW_ALL, PERMISSIONS.AUDITS_VIEW_ASSIGNED],
          badge: 'audits'
        },
        {
          label: 'Evidence',
          route: '/evidence',
          icon: '▧',
          permissions: [PERMISSIONS.EVIDENCE_VIEW]
        },
        {
          label: 'Findings',
          route: '/findings',
          icon: '◇',
          permissions: [
            PERMISSIONS.FINDINGS_CREATE,
            PERMISSIONS.FINDINGS_MANAGE,
            PERMISSIONS.FINDINGS_RESPOND
          ],
          badge: 'findings'
        }
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [{ label: 'AI Copilot', route: '/copilot', icon: '✳', beta: true }]
    }
  ];

  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe((event) => {
      this.standaloneRoute.set(this.isStandaloneRoute(event.urlAfterRedirects));
    });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  canAccess(item: NavigationItem): boolean {
    return !item.permissions || this.auth.hasAnyPermission(item.permissions);
  }

  hasVisibleItems(group: NavigationGroup): boolean {
    return group.items.some((item) => this.canAccess(item));
  }

  initials(fullName: string): string {
    return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  displayRole(role: string): string {
    return {
      ADMIN: 'Administrator',
      AUDIT_MANAGER: 'Audit manager',
      AUDITOR: 'Auditor',
      AUDITEE: 'Auditee'
    }[role] ?? role;
  }

  async logout(): Promise<void> {
    this.profileOpen.set(false);
    this.closeMenu();
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

  private isStandaloneRoute(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0];
    return path === '/login' || path === '/forbidden';
  }
}

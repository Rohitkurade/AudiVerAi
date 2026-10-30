import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { PERMISSIONS } from '../../core/auth/auth.models';
import { Audit, AuditStatus } from '../../core/demo-data.model';
import { DemoDataService } from '../../core/demo-data.service';

@Component({
  selector: 'app-audits-page',
  standalone: true,
  imports: [FormsModule, HasPermissionDirective],
  templateUrl: './audits.html'
})
export class AuditsPage {
  readonly auth = inject(AuthService);
  readonly permissions = PERMISSIONS;
  readonly demo = inject(DemoDataService);
  readonly search = signal('');
  readonly statusFilter = signal('All statuses');
  readonly selectedId = signal<string | null>(null);
  readonly createOpen = signal(false);
  readonly selectedAudit = computed(() => {
    const id = this.selectedId();
    return id ? this.demo.auditFor(id) : undefined;
  });
  readonly statuses: Array<AuditStatus | 'All statuses'> = ['All statuses', 'Planning', 'In progress', 'Under review', 'Completed'];
  readonly auditTypes = ['Financial', 'IT General Controls', 'Operational', 'Compliance'];
  auditDraft = { name: '', client: '', type: 'Financial', period: '', owner: '' };

  constructor(route: ActivatedRoute) {
    const requestedAudit = route.snapshot.queryParamMap.get('audit');
    const shouldCreate = route.snapshot.queryParamMap.get('create') === 'true';
    if (requestedAudit) this.selectedId.set(requestedAudit);
    if (shouldCreate && this.auth.hasPermission(PERMISSIONS.AUDITS_CREATE)) this.createOpen.set(true);
  }

  filteredAudits(): Audit[] {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.demo.audits().filter((audit) => {
      const matchesText = !query || [audit.id, audit.name, audit.client, audit.owner, audit.type]
        .some((value) => value.toLowerCase().includes(query));
      return matchesText && (status === 'All statuses' || audit.status === status);
    });
  }

  statusClass(status: AuditStatus): string {
    return `status-${status.toLowerCase().replaceAll(' ', '-')}`;
  }

  createAudit(form: NgForm): void {
    if (!this.auth.hasPermission(PERMISSIONS.AUDITS_CREATE)) return;
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.demo.createAudit({ ...this.auditDraft });
    this.auditDraft = { name: '', client: '', type: 'Financial', period: '', owner: this.auth.user()?.fullName ?? '' };
    form.resetForm(this.auditDraft);
    this.createOpen.set(false);
  }

  setStatus(status: AuditStatus): void {
    const audit = this.selectedAudit();
    if (audit) this.demo.updateAuditStatus(audit.id, status);
  }

  closeDialogs(): void {
    this.createOpen.set(false);
    this.selectedId.set(null);
  }
}

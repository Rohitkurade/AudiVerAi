import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { PERMISSIONS } from '../../core/auth/auth.models';
import { Audit, Finding, FindingSeverity, FindingStatus } from '../../core/demo-data.model';
import { DemoDataService } from '../../core/demo-data.service';

@Component({
  selector: 'app-findings-page',
  standalone: true,
  imports: [FormsModule, RouterLink, HasPermissionDirective],
  templateUrl: './findings.html'
})
export class FindingsPage {
  readonly permissions = PERMISSIONS;
  readonly demo = inject(DemoDataService);
  readonly search = signal('');
  readonly severityFilter = signal('All severities');
  readonly statusFilter = signal('All statuses');
  readonly severities: Array<FindingSeverity | 'All severities'> = ['All severities', 'Critical', 'High', 'Medium', 'Low'];
  readonly statuses: Array<FindingStatus | 'All statuses'> = ['All statuses', 'Open', 'In review', 'Resolved'];
  readonly countBySeverity = (severity: FindingSeverity) => this.demo.findings().filter((finding) => finding.severity === severity && finding.status !== 'Resolved').length;
  readonly countResolved = () => this.demo.findings().filter((finding) => finding.status === 'Resolved').length;

  filteredFindings(): Finding[] {
    const query = this.search().trim().toLowerCase();
    const severity = this.severityFilter();
    const status = this.statusFilter();
    return this.demo.findings().filter((finding) => {
      const audit = this.demo.auditFor(finding.auditId);
      const matchesText = !query || [finding.id, finding.title, finding.description, audit?.name ?? '']
        .some((value) => value.toLowerCase().includes(query));
      return matchesText && (severity === 'All severities' || finding.severity === severity)
        && (status === 'All statuses' || finding.status === status);
    });
  }

  auditFor(id: string): Audit | undefined {
    return this.demo.auditFor(id);
  }

  severityClass(severity: FindingSeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  statusClass(status: FindingStatus): string {
    return `finding-${status.toLowerCase().replaceAll(' ', '-')}`;
  }

  changeStatus(id: string, status: FindingStatus): void {
    this.demo.updateFindingStatus(id, status);
  }
}

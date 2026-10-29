import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoDataService } from '../../core/demo-data.service';
import { Audit, AuditStatus } from '../../core/demo-data.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardPage {
  readonly demo = inject(DemoDataService);
  readonly completedAudits = computed(() => this.demo.audits().filter((audit) => audit.status === 'Completed').length);
  readonly highFindings = computed(() => this.demo.findings().filter((finding) => finding.severity === 'High' && finding.status !== 'Resolved').length);
  readonly statusSummary = computed(() => {
    const statuses: AuditStatus[] = ['In progress', 'Under review', 'Planning', 'Completed'];
    return statuses.map((status) => ({
      status,
      count: this.demo.audits().filter((audit) => audit.status === status).length
    }));
  });

  statusClass(status: Audit['status']): string {
    return `status-${status.toLowerCase().replaceAll(' ', '-')}`;
  }

  activityClass(kind: string): string {
    return `activity-${kind}`;
  }
}

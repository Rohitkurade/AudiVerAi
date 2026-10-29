import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Audit, Evidence } from '../../core/demo-data.model';
import { DemoDataService } from '../../core/demo-data.service';

@Component({
  selector: 'app-evidence-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './evidence.html'
})
export class EvidencePage {
  readonly demo = inject(DemoDataService);
  readonly search = signal('');
  readonly auditFilter = signal('All audits');
  readonly linkedFindingCount = () => new Set(this.demo.evidence().flatMap((item) => item.findingIds)).size;

  filteredEvidence(): Evidence[] {
    const query = this.search().trim().toLowerCase();
    const auditId = this.auditFilter();
    return this.demo.evidence().filter((item) => {
      const audit = this.demo.auditFor(item.auditId);
      const matchesText = !query || [item.filename, item.id, item.type, audit?.name ?? '', audit?.client ?? '']
        .some((value) => value.toLowerCase().includes(query));
      return matchesText && (auditId === 'All audits' || item.auditId === auditId);
    });
  }

  auditFor(id: string): Audit | undefined {
    return this.demo.auditFor(id);
  }

  fileClass(type: Evidence['type']): string {
    return `file-${type.toLowerCase().replaceAll(' ', '-')}`;
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CopilotSuggestion, FindingSeverity } from '../../core/demo-data.model';
import { DemoDataService } from '../../core/demo-data.service';

@Component({
  selector: 'app-copilot-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './copilot.html'
})
export class CopilotPage {
  readonly demo = inject(DemoDataService);
  readonly expandedId = signal<string | null>(null);

  auditName(id: string): string {
    return this.demo.auditFor(id)?.name ?? 'Unknown audit';
  }

  severityClass(severity: FindingSeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  toggleReview(suggestion: CopilotSuggestion): void {
    this.expandedId.set(this.expandedId() === suggestion.id ? null : suggestion.id);
  }

  respond(id: string, action: 'Accepted' | 'Rejected'): void {
    this.demo.updateSuggestionStatus(id, action);
  }
}

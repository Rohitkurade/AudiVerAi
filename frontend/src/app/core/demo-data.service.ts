import { computed, Injectable, signal } from '@angular/core';
import {
  Activity,
  Audit,
  AuditStatus,
  CopilotSuggestion,
  DemoState,
  Evidence,
  Finding,
  FindingStatus,
  SuggestionStatus
} from './demo-data.model';

const STORAGE_KEY = 'audiverai-demo-state-v1';

const INITIAL_STATE: DemoState = {
  audits: [
    { id: 'AUD-2025-014', name: 'Q4 Financial Controls', client: 'Northstar Health Group', type: 'Financial', period: 'Oct – Dec 2025', owner: 'Alex Morgan', status: 'In progress', progress: 68, updatedAt: 'Today, 10:42 AM' },
    { id: 'AUD-2025-013', name: 'Access & Identity Review', client: 'Meridian Financial', type: 'IT General Controls', period: 'Nov – Dec 2025', owner: 'Jordan Lee', status: 'Under review', progress: 84, updatedAt: 'Today, 9:18 AM' },
    { id: 'AUD-2025-012', name: 'Vendor Risk Assessment', client: 'Cedar & Stone Retail', type: 'Operational', period: 'Sep – Nov 2025', owner: 'Alex Morgan', status: 'In progress', progress: 47, updatedAt: 'Yesterday' },
    { id: 'AUD-2025-011', name: 'Revenue Recognition', client: 'Northstar Health Group', type: 'Financial', period: 'Jul – Sep 2025', owner: 'Sam Rivera', status: 'Completed', progress: 100, updatedAt: 'Oct 22, 2025' },
    { id: 'AUD-2025-010', name: 'Data Privacy Controls', client: 'Meridian Financial', type: 'Compliance', period: 'Aug – Oct 2025', owner: 'Jordan Lee', status: 'Planning', progress: 12, updatedAt: 'Oct 21, 2025' }
  ],
  evidence: [
    { id: 'EVD-0081', filename: 'Q4_General_Ledger.xlsx', type: 'Spreadsheet', auditId: 'AUD-2025-014', uploadedAt: 'Today, 9:32 AM', size: '2.4 MB', findingIds: ['FND-024', 'FND-025'], sample: true },
    { id: 'EVD-0080', filename: 'Access_Review_Oct.pdf', type: 'PDF', auditId: 'AUD-2025-013', uploadedAt: 'Today, 8:16 AM', size: '1.8 MB', findingIds: ['FND-026'], sample: true },
    { id: 'EVD-0079', filename: 'Vendor_Assessment_2025.docx', type: 'Document', auditId: 'AUD-2025-012', uploadedAt: 'Yesterday', size: '842 KB', findingIds: ['FND-027'], sample: true },
    { id: 'EVD-0078', filename: 'Journal_Entries_Q4.csv', type: 'CSV', auditId: 'AUD-2025-014', uploadedAt: 'Yesterday', size: '420 KB', findingIds: ['FND-024'], sample: true },
    { id: 'EVD-0077', filename: 'Revenue_Sample_Test.pdf', type: 'PDF', auditId: 'AUD-2025-011', uploadedAt: 'Oct 22, 2025', size: '3.1 MB', findingIds: [], sample: true },
    { id: 'EVD-0076', filename: 'Policy_Exceptions_Review.xlsx', type: 'Spreadsheet', auditId: 'AUD-2025-010', uploadedAt: 'Oct 21, 2025', size: '1.2 MB', findingIds: [], sample: true }
  ],
  findings: [
    { id: 'FND-024', title: 'Unreconciled journal entries', severity: 'High', status: 'Open', description: 'Three manual journal entries lack documented reviewer approval in the sample period.', auditId: 'AUD-2025-014', evidenceIds: ['EVD-0081', 'EVD-0078'], createdAt: 'Today' },
    { id: 'FND-025', title: 'Segregation of duties exception', severity: 'Medium', status: 'In review', description: 'One user account appears in both the payment preparation and approval groups.', auditId: 'AUD-2025-014', evidenceIds: ['EVD-0081'], createdAt: 'Yesterday' },
    { id: 'FND-026', title: 'Dormant account remains enabled', severity: 'High', status: 'Open', description: 'A sample account shows no activity for 120 days but remains active in the access review.', auditId: 'AUD-2025-013', evidenceIds: ['EVD-0080'], createdAt: 'Oct 28, 2025' },
    { id: 'FND-027', title: 'Vendor review documentation gap', severity: 'Low', status: 'Open', description: 'Annual review evidence was not attached for one sampled critical vendor.', auditId: 'AUD-2025-012', evidenceIds: ['EVD-0079'], createdAt: 'Oct 27, 2025' }
  ],
  suggestions: [
    { id: 'SUG-001', title: 'Review approval evidence for manual entries', severity: 'High', description: 'The sample ledger contains entries without a matching reviewer reference. Consider confirming approval evidence and documenting any exception.', auditId: 'AUD-2025-014', evidenceIds: ['EVD-0081', 'EVD-0078'], status: 'Ready for review', response: 'Simulated suggestion: three sample entries may need follow-up because a reviewer reference is not present in the supplied example records. Confirm against source documentation before drawing a conclusion.' },
    { id: 'SUG-002', title: 'Confirm dormant account ownership', severity: 'Medium', description: 'The example access review lists an account with no recent activity. Verify its owner and business need with the control owner.', auditId: 'AUD-2025-013', evidenceIds: ['EVD-0080'], status: 'Ready for review', response: 'Simulated suggestion: ask the control owner to confirm whether the example dormant account remains required and retain the response as audit evidence.' }
  ],
  activities: [
    { id: 'ACT-01', title: 'Evidence added', detail: 'Q4_General_Ledger.xlsx · Q4 Financial Controls', time: '10:42 AM', kind: 'evidence' },
    { id: 'ACT-02', title: 'Finding moved to review', detail: 'Segregation of duties exception', time: '9:18 AM', kind: 'finding' },
    { id: 'ACT-03', title: 'Audit progress updated', detail: 'Access & Identity Review · 84% complete', time: 'Yesterday', kind: 'audit' },
    { id: 'ACT-04', title: 'Copilot suggestion generated', detail: 'Q4 Financial Controls · simulated', time: 'Yesterday', kind: 'copilot' }
  ]
};

function isDemoState(value: unknown): value is DemoState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<DemoState>;
  return Array.isArray(state.audits) && Array.isArray(state.evidence) &&
    Array.isArray(state.findings) && Array.isArray(state.suggestions) &&
    Array.isArray(state.activities);
}

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  private readonly message = signal<string | null>(null);
  private readonly state = signal(this.loadState());

  readonly audits = computed(() => this.state().audits);
  readonly evidence = computed(() => this.state().evidence);
  readonly findings = computed(() => this.state().findings);
  readonly suggestions = computed(() => this.state().suggestions);
  readonly activities = computed(() => this.state().activities);
  readonly notice = this.message.asReadonly();
  readonly openFindingsCount = computed(() => this.state().findings.filter((finding) => finding.status !== 'Resolved').length);
  readonly activeAuditsCount = computed(() => this.state().audits.filter((audit) => audit.status !== 'Completed').length);
  readonly averageProgress = computed(() => {
    const active = this.state().audits.filter((audit) => audit.status !== 'Completed');
    return active.length ? Math.round(active.reduce((sum, audit) => sum + audit.progress, 0) / active.length) : 0;
  });

  auditFor(id: string): Audit | undefined {
    return this.state().audits.find((audit) => audit.id === id);
  }

  evidenceFor(id: string): Evidence | undefined {
    return this.state().evidence.find((evidence) => evidence.id === id);
  }

  createAudit(details: Pick<Audit, 'name' | 'client' | 'type' | 'period' | 'owner'>): void {
    const audit: Audit = {
      ...details,
      id: `AUD-DEMO-${Date.now().toString().slice(-5)}`,
      status: 'Planning',
      progress: 0,
      updatedAt: 'Just now'
    };
    this.update((state) => ({
      ...state,
      audits: [audit, ...state.audits],
      activities: this.addActivity(state.activities, 'Audit created', `${audit.name} · ${audit.client}`, 'audit')
    }), `Created ${audit.name} in this browser's demo workspace.`);
  }

  updateAuditStatus(id: string, status: AuditStatus): void {
    const audit = this.auditFor(id);
    if (!audit) return;
    this.update((state) => ({
      ...state,
      audits: state.audits.map((item) => item.id === id ? { ...item, status, progress: status === 'Completed' ? 100 : item.progress, updatedAt: 'Just now' } : item),
      activities: this.addActivity(state.activities, 'Audit status updated', `${audit.name} · ${status}`, 'audit')
    }), `${audit.name} moved to ${status}.`);
  }

  updateFindingStatus(id: string, status: FindingStatus): void {
    const finding = this.state().findings.find((item) => item.id === id);
    if (!finding) return;
    this.update((state) => ({
      ...state,
      findings: state.findings.map((item) => item.id === id ? { ...item, status } : item),
      activities: this.addActivity(state.activities, 'Finding status updated', `${finding.title} · ${status}`, 'finding')
    }), `${finding.title} moved to ${status}.`);
  }

  updateSuggestionStatus(id: string, status: SuggestionStatus): void {
    const suggestion = this.state().suggestions.find((item) => item.id === id);
    if (!suggestion || suggestion.status !== 'Ready for review') return;

    this.update((state) => {
      const suggestions = state.suggestions.map((item) => item.id === id ? { ...item, status } : item);
      if (status !== 'Accepted') {
        return {
          ...state,
          suggestions,
          activities: this.addActivity(state.activities, 'Copilot suggestion rejected', suggestion.title, 'copilot')
        };
      }

      const findingId = `FND-DEMO-${Date.now().toString().slice(-5)}`;
      const finding: Finding = {
        id: findingId,
        title: suggestion.title,
        severity: suggestion.severity,
        status: 'Open',
        description: suggestion.description,
        auditId: suggestion.auditId,
        evidenceIds: suggestion.evidenceIds,
        createdAt: 'Just now'
      };
      return {
        ...state,
        suggestions,
        findings: [finding, ...state.findings],
        evidence: state.evidence.map((evidence) => suggestion.evidenceIds.includes(evidence.id)
          ? { ...evidence, findingIds: [...new Set([...evidence.findingIds, findingId])] }
          : evidence),
        activities: this.addActivity(state.activities, 'Copilot suggestion accepted', `${suggestion.title} · added as ${findingId}`, 'copilot')
      };
    }, status === 'Accepted' ? 'Suggestion accepted and added to Findings as a draft for human review.' : 'Suggestion rejected.');
  }

  clearNotice(): void {
    this.message.set(null);
  }

  private loadState(): DemoState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return structuredClone(INITIAL_STATE);
      const parsed: unknown = JSON.parse(stored);
      if (isDemoState(parsed)) return parsed;
      this.message.set('Saved demo data was invalid. A fresh sample workspace is loaded.');
      return structuredClone(INITIAL_STATE);
    } catch (error) {
      console.error('Unable to read AudiVerAI demo data from local storage.', error);
      this.message.set('Saved demo data could not be read. A fresh sample workspace is loaded.');
      return structuredClone(INITIAL_STATE);
    }
  }

  private update(transform: (state: DemoState) => DemoState, notice: string): void {
    const next = transform(this.state());
    this.state.set(next);
    this.message.set(notice);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to save AudiVerAI demo data to local storage.', error);
      this.message.set('Change applied for this session, but browser storage could not save it.');
    }
  }

  private addActivity(activities: Activity[], title: string, detail: string, kind: Activity['kind']): Activity[] {
    const activity: Activity = { id: `ACT-${Date.now()}`, title, detail, time: 'Just now', kind };
    return [activity, ...activities].slice(0, 8);
  }
}

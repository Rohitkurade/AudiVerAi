export type AuditStatus = 'Planning' | 'In progress' | 'Under review' | 'Completed';
export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingStatus = 'Open' | 'In review' | 'Resolved';
export type SuggestionStatus = 'Ready for review' | 'Accepted' | 'Rejected';

export interface Audit {
  id: string;
  name: string;
  client: string;
  type: string;
  period: string;
  owner: string;
  status: AuditStatus;
  progress: number;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  filename: string;
  type: 'Spreadsheet' | 'PDF' | 'Document' | 'CSV';
  auditId: string;
  uploadedAt: string;
  size: string;
  findingIds: string[];
  sample: true;
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  description: string;
  auditId: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface CopilotSuggestion {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string;
  auditId: string;
  evidenceIds: string[];
  status: SuggestionStatus;
  response: string;
}

export interface Activity {
  id: string;
  title: string;
  detail: string;
  time: string;
  kind: 'audit' | 'evidence' | 'finding' | 'copilot';
}

export interface DemoState {
  audits: Audit[];
  evidence: Evidence[];
  findings: Finding[];
  suggestions: CopilotSuggestion[];
  activities: Activity[];
}

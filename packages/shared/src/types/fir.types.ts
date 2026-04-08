export enum FirStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  FINALIZED = 'FINALIZED',
  FILED = 'FILED',
}

export enum CodeType {
  IPC = 'IPC',
  BNS = 'BNS',
}

export interface AccusedPerson {
  name: string;
  age?: number;
  address?: string;
  physicalDescription?: string;
  relation?: string;
}

export interface Victim {
  name: string;
  age?: number;
  address?: string;
  phone?: string;
}

export interface Witness {
  name: string;
  address?: string;
  phone?: string;
}

export interface LegalSection {
  section: string;
  title: string;
  codeType: CodeType;
  applicabilityReason?: string;
}

export interface AiAnalysisResult {
  incidentSummary: string;
  dateTimeApprox: string | null;
  location: string | null;
  complainant: { name: string; address?: string; phone?: string } | null;
  accusedPersons: AccusedPerson[];
  victims: Victim[];
  witnesses: Witness[];
  offenceKeywords: string[];
  propertyInvolved: string | null;
  primaryBnsSections: LegalSection[];
  primaryIpcSections: LegalSection[];
  severity: 'BAILABLE' | 'NON-BAILABLE';
  cognizable: boolean;
}

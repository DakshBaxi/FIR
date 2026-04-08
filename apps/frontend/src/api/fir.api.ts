import { api } from './client';
import type { CreateFirInput, FinalizeFirInput, FirStatus, UpdateFirInput } from '@fir/shared';

export interface FirListItem {
  id: string;
  firNumber?: string | null;
  status: FirStatus;
  complainantName: string;
  offenceNature?: string | null;
  primaryBnsSections: string[];
  incidentLocation?: string | null;
  createdAt: string;
  finalizedAt?: string | null;
  filedBy: {
    fullName: string;
    badgeNumber: string;
  };
}

export interface FirListResponse {
  items: FirListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FirRecord extends FirListItem {
  stationId: string;
  filedByOfficerId: string;
  complainantAddress?: string | null;
  complainantPhone?: string | null;
  complainantIdType?: string | null;
  complainantIdNumber?: string | null;
  incidentDescription: string;
  incidentDatetime?: string | null;
  accusedPersons: Array<Record<string, unknown>>;
  victims: Array<Record<string, unknown>>;
  witnesses: Array<Record<string, unknown>>;
  primaryIpcSections: string[];
  aiAnalysisRaw?: Record<string, unknown> | null;
  firContentJson?: Record<string, unknown> | null;
  firContentHtml?: string | null;
  filedBy: {
    fullName: string;
    rank: string;
    badgeNumber: string;
  };
  station: {
    stationName: string;
    stationCode: string;
    district: string;
    state: string;
  };
}

export interface FirAnalysisPerson {
  name: string;
  age?: number | null;
  address?: string | null;
  phone?: string | null;
  physical_description?: string | null;
}

export interface FirAnalysisSection {
  section: string;
  title: string;
  code_type: 'BNS' | 'IPC';
  applicability_reason: string;
}

export interface FirAnalysisPayload {
  entities?: {
    incident_summary?: string;
    date_time_approx?: string | null;
    location?: string | null;
    complainant?: {
      name: string;
      address?: string | null;
      phone?: string | null;
    } | null;
    accused_persons?: FirAnalysisPerson[];
    victims?: FirAnalysisPerson[];
    witnesses?: FirAnalysisPerson[];
    offence_keywords?: string[];
    property_involved?: string | null;
  };
  sections?: {
    primary_bns_sections?: FirAnalysisSection[];
    primary_ipc_sections?: FirAnalysisSection[];
    severity?: string;
    cognizable?: boolean;
  };
  fir_draft?: {
    date_of_report?: string;
    time_of_report?: string;
    complainant_statement_formal?: string;
    gist_of_fir?: string;
    offence_nature?: string;
    action_taken?: string;
    investigating_officer_notes?: string;
  };
}

export async function createFir(data: CreateFirInput) {
  const res = await api.post('/firs', data);
  return res.data.data as FirRecord;
}

export async function listFirs(params?: { page?: number; limit?: number; status?: FirStatus }) {
  const res = await api.get('/firs', { params });
  return res.data.data as FirListResponse;
}

export async function getFir(id: string) {
  const res = await api.get(`/firs/${id}`);
  return res.data.data as FirRecord;
}

export async function updateFir(id: string, data: UpdateFirInput) {
  const res = await api.patch(`/firs/${id}`, data);
  return res.data.data as FirRecord;
}

export async function finalizeFir(id: string, data: FinalizeFirInput) {
  const res = await api.post(`/firs/${id}/finalize`, data);
  return res.data.data as FirRecord;
}

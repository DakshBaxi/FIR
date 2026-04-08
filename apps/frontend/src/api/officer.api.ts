import { api } from './client';
import type { CreateOfficerInput, UpdateOfficerInput } from '@fir/shared';
import type { OfficerRole } from '@fir/shared';

export interface OfficerListItem {
  id: string;
  badgeNumber: string;
  fullName: string;
  rank: string;
  role: OfficerRole;
  phone: string;
  email?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface OfficerListResponse {
  items: OfficerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function createOfficer(data: CreateOfficerInput) {
  const res = await api.post('/officers', data);
  return res.data.data as OfficerListItem;
}

export async function listOfficers(params?: { page?: number; limit?: number }) {
  const res = await api.get('/officers', { params });
  return res.data.data as OfficerListResponse;
}

export async function updateOfficer(id: string, data: UpdateOfficerInput) {
  const res = await api.patch(`/officers/${id}`, data);
  return res.data.data as OfficerListItem;
}

export async function deactivateOfficer(id: string) {
  const res = await api.delete(`/officers/${id}`);
  return res.data.data as Pick<OfficerListItem, 'id' | 'badgeNumber' | 'isActive'>;
}

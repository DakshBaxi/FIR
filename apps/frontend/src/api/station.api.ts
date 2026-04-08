import { api } from './client';
import type { CreateStationInput, UpdateStationInput } from '@fir/shared';

export interface StationDetails {
  id: string;
  stationName: string;
  stationCode: string;
  district: string;
  state: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  jurisdiction?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  isActive: boolean;
  _count?: {
    officers: number;
    firs: number;
  };
}

export async function registerStation(data: CreateStationInput) {
  const res = await api.post('/stations/register', data);
  return res.data.data as StationDetails;
}

export async function getMyStation() {
  const res = await api.get('/stations/me');
  return res.data.data as StationDetails;
}

export async function updateMyStation(data: UpdateStationInput) {
  const res = await api.patch('/stations/me', data);
  return res.data.data as StationDetails;
}

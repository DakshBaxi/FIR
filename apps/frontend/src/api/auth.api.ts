import { api } from './client';
import type { LoginInput } from '@fir/shared';
import type { OfficerInfo } from '../store/authStore';

export interface AuthSession {
  accessToken: string;
  officer: OfficerInfo;
}

export async function login(data: LoginInput) {
  const res = await api.post('/auth/login', data);
  return res.data.data as AuthSession;
}

export async function refreshSession() {
  const res = await api.post('/auth/refresh');
  return res.data.data as AuthSession;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function getMe() {
  const res = await api.get('/auth/me');
  return res.data.data;
}

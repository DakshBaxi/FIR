import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: env.AI_SERVICE_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export interface AnalyzeIncidentPayload {
  incident_story: string;
  station_name: string;
  station_code: string;
  district: string;
  state: string;
  officer_name: string;
  officer_rank: string;
  officer_badge: string;
}

export async function analyzeIncident(payload: AnalyzeIncidentPayload) {
  try {
    const response = await aiClient.post('/analyze', payload);
    return response.data;
  } catch (err) {
    const error = err as {
      code?: string;
      message?: string;
      response?: {
        status?: number;
        data?: { detail?: string; error?: string };
      };
    };

    const detail =
      error.response?.data?.detail ??
      error.response?.data?.error ??
      error.message ??
      'Unknown AI service error';

    logger.error('AI service error', {
      code: error.code,
      status: error.response?.status,
      detail,
    });

    throw new Error(`AI analysis service is unavailable. ${detail}`);
  }
}

export async function checkAiHealth(): Promise<boolean> {
  try {
    const response = await aiClient.get('/health', { timeout: 5000 });
    return response.data?.ollama === 'connected';
  } catch {
    return false;
  }
}

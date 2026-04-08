import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenId(): string {
  return uuidv4();
}

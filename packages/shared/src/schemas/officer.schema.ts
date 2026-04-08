import { z } from 'zod';
import { OfficerRole } from '../types/roles.types';

export const CreateOfficerSchema = z.object({
  badgeNumber: z.string().min(3).max(50).trim(),
  fullName: z.string().min(2).max(200).trim(),
  rank: z.string().min(2).max(100).trim(),
  role: z.nativeEnum(OfficerRole).default(OfficerRole.OFFICER),
  phone: z.string().regex(/^[0-9+\-\s]{7,20}$/).trim(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and a number'),
});

export const UpdateOfficerSchema = CreateOfficerSchema.omit({
  badgeNumber: true,
  password: true,
}).partial();

export type CreateOfficerInput = z.infer<typeof CreateOfficerSchema>;
export type UpdateOfficerInput = z.infer<typeof UpdateOfficerSchema>;

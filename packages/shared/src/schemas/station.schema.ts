import { z } from 'zod';

export const CreateStationSchema = z.object({
  stationName: z.string().min(3).max(200).trim(),
  stationCode: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9/\-]+$/, 'Station code must be uppercase letters, numbers, / or -')
    .trim(),
  district: z.string().min(2).max(100).trim(),
  state: z.string().min(2).max(100).trim(),
  address: z.string().min(10).max(500).trim(),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{7,20}$/, 'Invalid phone number')
    .optional(),
  email: z.string().email('Invalid email').optional(),
  jurisdiction: z.string().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // First admin officer details — created along with the station
  adminOfficerName: z.string().min(2).max(200).trim(),
  adminBadgeNumber: z.string().min(3).max(50).trim(),
  adminRank: z.string().min(2).max(100).trim(),
  adminPhone: z.string().regex(/^[0-9+\-\s]{7,20}$/).trim(),
  adminEmail: z.string().email().optional(),
  adminPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and a number'),
});

export const UpdateStationSchema = CreateStationSchema.omit({
  stationCode: true,
  adminOfficerName: true,
  adminBadgeNumber: true,
  adminRank: true,
  adminPhone: true,
  adminEmail: true,
  adminPassword: true,
}).partial();

export type CreateStationInput = z.infer<typeof CreateStationSchema>;
export type UpdateStationInput = z.infer<typeof UpdateStationSchema>;

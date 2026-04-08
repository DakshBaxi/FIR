import { z } from 'zod';

const AccusedPersonSchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(150).optional(),
  address: z.string().max(500).optional(),
  physicalDescription: z.string().max(1000).optional(),
  relation: z.string().max(200).optional(),
});

const VictimSchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(150).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
});

const WitnessSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
});

export const CreateFirSchema = z.object({
  complainantName: z.string().min(2).max(200).trim(),
  complainantAddress: z.string().max(500).trim().optional(),
  complainantPhone: z.string().regex(/^[0-9+\-\s]{7,20}$/).optional(),
  complainantIdType: z.enum(['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE', 'OTHER']).optional(),
  complainantIdNumber: z.string().max(50).optional(),
  incidentDescription: z
    .string()
    .min(50, 'Please provide at least 50 characters describing the incident')
    .max(10000, 'Description too long'),
  incidentDatetime: z.string().datetime().optional(),
  incidentLocation: z.string().max(500).optional(),
});

export const UpdateFirSchema = z.object({
  complainantName: z.string().min(2).max(200).trim().optional(),
  complainantAddress: z.string().max(500).optional(),
  complainantPhone: z.string().max(20).optional(),
  incidentLocation: z.string().max(500).optional(),
  incidentDatetime: z.string().datetime().optional(),
  offenceNature: z.string().max(200).optional(),
  accusedPersons: z.array(AccusedPersonSchema).optional(),
  victims: z.array(VictimSchema).optional(),
  witnesses: z.array(WitnessSchema).optional(),
  propertyDetails: z.record(z.unknown()).optional(),
  firContentJson: z.record(z.unknown()).optional(),
  firContentHtml: z.string().optional(),
});

export const FinalizeFirSchema = z.object({
  firContentJson: z.record(z.unknown()),
  firContentHtml: z.string(),
});

export type CreateFirInput = z.infer<typeof CreateFirSchema>;
export type UpdateFirInput = z.infer<typeof UpdateFirSchema>;
export type FinalizeFirInput = z.infer<typeof FinalizeFirSchema>;

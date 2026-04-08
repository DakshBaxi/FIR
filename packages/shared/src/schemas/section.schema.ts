import { z } from 'zod';
import { CodeType } from '../types/fir.types';

export const SearchSectionsSchema = z.object({
  query: z.string().min(2).max(200),
  codeType: z.nativeEnum(CodeType).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchSectionsInput = z.infer<typeof SearchSectionsSchema>;

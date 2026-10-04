import { z } from 'zod';

const bloodGroupEnum = z.enum([
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]);

// Query params arrive as strings, so numbers are coerced.
const requestBoardQuerySchema = z.object({
  bloodGroup: bloodGroupEnum.optional(),
  // A donor's own group: shows every request that group can safely give to.
  canHelp: bloodGroupEnum.optional(),
  minUrgency: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['open', 'matched', 'fulfilled', 'all']).default('open'),
  sortBy: z.enum(['urgency', 'createdAt']).default('urgency'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type TRequestBoardQuery = z.infer<typeof requestBoardQuerySchema>;

export const PublicValidation = {
  requestBoardQuerySchema,
};

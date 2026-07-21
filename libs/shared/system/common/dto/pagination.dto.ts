import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const paginationQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export class PaginationDto extends createZodDto(paginationQuerySchema) {}

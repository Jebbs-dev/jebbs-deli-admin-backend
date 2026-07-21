import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';

export const queryProductSchema = paginationQuerySchema.extend({
  isFeatured: z.string().optional(),
  storeId: z.string().optional(),
});

export class QueryProductDto extends createZodDto(queryProductSchema) {}

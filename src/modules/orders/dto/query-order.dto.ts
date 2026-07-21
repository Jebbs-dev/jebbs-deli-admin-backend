import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';

export const queryOrderSchema = paginationQuerySchema.extend({
  storeId: z.string().optional(),
  userId: z.string().optional(),
});

export class QueryOrderDto extends createZodDto(queryOrderSchema) {}

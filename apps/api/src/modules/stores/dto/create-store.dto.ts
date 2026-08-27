import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createStoreSchema = z.object({
  name: z.string(),
  email: z.email(),
  telephone: z.string().optional(),
  address: z.string(),
  preparationTime: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.coerce.boolean().optional(),
  deliveryFee: z.coerce.number().optional(),
  commissionPercent: z.coerce.number().optional(),
  bagFeeEnabled: z.coerce.boolean().optional(),
  bagFeeAmount: z.coerce.number().optional(),
  bagCommissionable: z.coerce.boolean().optional(),
  surgeEnabled: z.coerce.boolean().optional(),
  surgeType: z.enum(['flat', 'percent']).optional(),
  surgeValue: z.coerce.number().optional(),
});

export class CreateStoreDto extends createZodDto(createStoreSchema) {}

export const updateStoreSchema = createStoreSchema.partial();

export class UpdateStoreDto extends createZodDto(updateStoreSchema) {}

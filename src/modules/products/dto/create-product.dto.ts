import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createProductSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.coerce.number(),
  stock: z.coerce.number().optional(),
  category: z.string().optional(),
  storeId: z.string(),
  storeTag: z.string().optional(),
  size: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
});

export class CreateProductDto extends createZodDto(createProductSchema) {}

export const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().optional(),
  stock: z.coerce.number().optional(),
  category: z.string().optional(),
  size: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
});

export class UpdateProductDto extends createZodDto(updateProductSchema) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number(),
  storeId: z.string(),
});

export const addToCartSchema = z.object({
  cartItems: z.array(cartItemSchema),
  totalPrice: z.coerce.number(),
  userId: z.string().optional(),
});

export class AddToCartDto extends createZodDto(addToCartSchema) {}

export const updateCartBodySchema = z.object({
  cartData: z.record(z.string(), z.unknown()),
  cartItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export class UpdateCartBodyDto extends createZodDto(updateCartBodySchema) {}

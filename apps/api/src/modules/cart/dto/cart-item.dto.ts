import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const cartItemSchema = z.object({
  productId: z.string().optional(),
  id: z.string().optional(),
  quantity: z.coerce.number().int().positive(),
  storeId: z.string(),
}).refine((item) => Boolean(item.productId || item.id), {
  message: 'productId is required',
  path: ['productId'],
}).transform((item) => ({
  productId: (item.productId || item.id) as string,
  quantity: item.quantity,
  storeId: item.storeId,
}));

export const addToCartSchema = z.object({
  cartItems: z.array(cartItemSchema),
  totalPrice: z.coerce.number().optional(),
  userId: z.string().optional(),
});

export class AddToCartDto extends createZodDto(addToCartSchema) {}

export const updateCartBodySchema = z.object({
  cartData: z
    .object({
      totalPrice: z.coerce.number().optional(),
    })
    .strict(),
  cartItems: z.array(cartItemSchema).optional(),
});

export class UpdateCartBodyDto extends createZodDto(updateCartBodySchema) {}

export const upsertCartItemSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  /** Absolute quantity. 0 removes the line. */
  quantity: z.coerce.number().int().min(0),
});

export class UpsertCartItemDto extends createZodDto(upsertCartItemSchema) {}

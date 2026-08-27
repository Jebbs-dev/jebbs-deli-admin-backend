import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createOrderSchema = z.object({
  storeId: z.string().min(1),
  fulfillmentType: z.enum(['delivery', 'pickup']).default('delivery'),
  vendorAddress: z.string().optional(),
  customerAddress: z.string().optional(),
  paymentMethod: z.enum(['wallet', 'paystack']).optional(),
  orderItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        storeId: z.string().optional(),
      }),
    )
    .min(1),
  // Legacy / hint fields (ignored for settlement; accepted for compat)
  userId: z.string().optional(),
  serviceFee: z.coerce.number().optional(),
  deliveryFee: z.coerce.number().optional(),
  subTotal: z.coerce.number().optional(),
  totalPrice: z.coerce.number().optional(),
});

export class CreateOrderDto extends createZodDto(createOrderSchema) {}

export const quoteOrderSchema = z.object({
  storeId: z.string().min(1),
  fulfillmentType: z.enum(['delivery', 'pickup']).default('delivery'),
  orderItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
});

export class QuoteOrderDto extends createZodDto(quoteOrderSchema) {}

export const updateOrderBodySchema = z.object({
  orderData: z.record(z.string(), z.unknown()),
  orderItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export class UpdateOrderBodyDto extends createZodDto(updateOrderBodySchema) {}

export const transitionOrderSchema = z.object({
  note: z.string().optional(),
});

export class TransitionOrderDto extends createZodDto(transitionOrderSchema) {}

export const assignRiderSchema = z.object({
  riderId: z.string().min(1),
});

export class AssignRiderDto extends createZodDto(assignRiderSchema) {}

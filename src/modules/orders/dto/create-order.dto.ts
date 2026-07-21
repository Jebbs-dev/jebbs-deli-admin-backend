import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createOrderSchema = z.object({
  userId: z.string(),
  storeId: z.string(),
  serviceFee: z.coerce.number(),
  deliveryFee: z.coerce.number(),
  subTotal: z.coerce.number(),
  totalPrice: z.coerce.number(),
  vendorAddress: z.string(),
  customerAddress: z.string(),
  paymentMethod: z.enum(['wallet', 'paystack']).optional(),
  orderItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export class CreateOrderDto extends createZodDto(createOrderSchema) {}

export const updateOrderBodySchema = z.object({
  orderData: z.record(z.string(), z.unknown()),
  orderItems: z.array(z.record(z.string(), z.unknown())).optional(),
});

export class UpdateOrderBodyDto extends createZodDto(updateOrderBodySchema) {}

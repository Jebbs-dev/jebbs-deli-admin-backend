import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const initializePaymentSchema = z.object({
  paymentData: z.object({
    email: z.email(),
    amount: z.string(),
    currency: z.string().optional(),
    callback_url: z.string().optional(),
  }),
  userId: z.string(),
  storeId: z.string(),
  orderId: z.string(),
});

export class InitializePaymentDto extends createZodDto(initializePaymentSchema) {}

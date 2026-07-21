import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const topupWalletSchema = z.object({
  amount: z.coerce
    .number()
    .min(100, 'Minimum top-up is 100 NGN')
    .max(1_000_000, 'Maximum top-up is 1,000,000 NGN'),
  callback_url: z.string().url().optional(),
});

export class TopupWalletDto extends createZodDto(topupWalletSchema) {}

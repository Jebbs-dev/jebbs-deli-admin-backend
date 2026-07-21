import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
  telephone: z.string().optional(),
  address: z.string().optional(),
  store: z.record(z.string(), z.unknown()).optional(),
});

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

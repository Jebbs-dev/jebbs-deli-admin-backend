import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}

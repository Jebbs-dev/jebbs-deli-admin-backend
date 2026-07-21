import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';

export const queryUserSchema = paginationQuerySchema;

export class QueryUserDto extends createZodDto(queryUserSchema) {}

export const createUserSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
  telephone: z.string().optional(),
  address: z.string().optional(),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}

export const createAdminSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
  telephone: z.string().optional(),
});

export class CreateAdminDto extends createZodDto(createAdminSchema) {}

export const createVendorSchema = z.object({
  name: z.string(),
  email: z.email(),
  password: z.string().min(6),
  telephone: z.string().optional(),
});

export class CreateVendorDto extends createZodDto(createVendorSchema) {}

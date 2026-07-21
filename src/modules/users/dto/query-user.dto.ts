import { createZodDto } from 'nestjs-zod';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';

export class QueryUserDto extends createZodDto(paginationQuerySchema) {}

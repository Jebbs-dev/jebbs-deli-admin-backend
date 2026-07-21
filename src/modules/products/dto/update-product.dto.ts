import { createZodDto } from 'nestjs-zod';
import { updateProductSchema } from './create-product.dto';

export class UpdateProductDto extends createZodDto(updateProductSchema) {}

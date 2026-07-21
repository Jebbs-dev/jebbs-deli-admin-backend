import { createZodDto } from 'nestjs-zod';
import { updateStoreSchema } from './create-store.dto';

export class UpdateStoreDto extends createZodDto(updateStoreSchema) {}

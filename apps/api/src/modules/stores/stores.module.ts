import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '@shared/features/auth/auth.module';
import { StoresController } from './stores.controller';
import { CreateStoreHandler } from './command/create-store';
import { UpdateStoreHandler } from './command/update-store';
import { DeleteStoreHandler } from './command/delete-store';
import { GetStoreByIdHandler } from './query/get-store-by-id';
import { GetStoresHandler } from './query/get-stores';
import { GetStoreCountHandler } from './query/get-store-count';

const CommandHandlers = [CreateStoreHandler, UpdateStoreHandler, DeleteStoreHandler];
const QueryHandlers = [GetStoreByIdHandler, GetStoresHandler, GetStoreCountHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [StoresController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class StoresModule {}

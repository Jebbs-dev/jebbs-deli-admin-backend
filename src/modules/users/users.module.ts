import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule as SharedAuthModule } from '@libs/shared/features/auth/auth.module';
import { UsersController } from './users.controller';

import { CreateUserHandler } from './command/create-user';
import { CreateAdminHandler } from './command/create-admin';
import { CreateVendorHandler } from './command/create-vendor';
import { UpdateUserHandler } from './command/update-user';
import { DeleteUserHandler } from './command/delete-user';

import { GetUserByIdHandler } from './query/get-user-by-id';
import { GetVendorAdminByIdHandler } from './query/get-vendor-admin-by-id';
import { GetCustomersHandler } from './query/get-customers';
import { GetAdminsHandler } from './query/get-admins';
import { GetVendorAdminsHandler } from './query/get-vendor-admins';
import { GetCustomerCountHandler } from './query/get-customer-count';

const CommandHandlers = [
  CreateUserHandler,
  CreateAdminHandler,
  CreateVendorHandler,
  UpdateUserHandler,
  DeleteUserHandler,
];

const QueryHandlers = [
  GetUserByIdHandler,
  GetVendorAdminByIdHandler,
  GetCustomersHandler,
  GetAdminsHandler,
  GetVendorAdminsHandler,
  GetCustomerCountHandler,
];

@Module({
  imports: [CqrsModule, SharedAuthModule],
  controllers: [UsersController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class UsersModule {}

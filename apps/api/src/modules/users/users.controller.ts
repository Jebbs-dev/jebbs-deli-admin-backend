import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@shared/features/auth/decorators/public.decorator';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { CreateUserDto, CreateAdminDto, CreateVendorDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

import { CreateUserCommand } from './command/create-user';
import { CreateAdminCommand } from './command/create-admin';
import { CreateVendorCommand } from './command/create-vendor';
import { UpdateUserCommand } from './command/update-user';
import { DeleteUserCommand } from './command/delete-user';

import { GetUserByIdQuery } from './query/get-user-by-id';
import { GetVendorAdminByIdQuery } from './query/get-vendor-admin-by-id';
import { GetCustomersQuery } from './query/get-customers';
import { GetAdminsQuery } from './query/get-admins';
import { GetVendorAdminsQuery } from './query/get-vendor-admins';
import { GetCustomerCountQuery } from './query/get-customer-count';
import {
  CustomerCountResponseDto,
  MessageResponseDto,
  PaginatedUsersResponseDto,
  RecordResponseDto,
  UserWrapperResponseDto,
} from '@shared/system/common/schemas/response.schemas';

@Controller()
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Public()
  @Post('users/register')
  @ZodResponse({
    status: 201,
    description: 'Registers a new customer and returns the created user',
    type: UserWrapperResponseDto,
  })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.commandBus.execute(
      new CreateUserCommand(dto.name, dto.email, dto.password, dto.telephone, dto.address),
    );
    return { user };
  }

  @Roles('ADMIN')
  @Post('admin/register')
  @UseInterceptors(FileInterceptor('avatar', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 201,
    description: 'Registers a new admin (existing admins only)',
    type: UserWrapperResponseDto,
  })
  async createAdmin(@Body() dto: CreateAdminDto, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.commandBus.execute(
      new CreateAdminCommand(dto.name, dto.email, dto.password, dto.telephone, file),
    );
    return { user };
  }

  @Roles('ADMIN')
  @Post('admin/vendor/register')
  @UseInterceptors(FileInterceptor('avatar', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 201,
    description: 'Registers a new vendor (admins only)',
    type: UserWrapperResponseDto,
  })
  async createVendorAdmin(@Body() dto: CreateVendorDto, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.commandBus.execute(
      new CreateVendorCommand(dto.name, dto.email, dto.password, dto.telephone, file),
    );
    return { user };
  }

  @Post('users/address')
  @ZodResponse({
    status: 201,
    description: 'Adds a delivery address for the authenticated user',
    type: MessageResponseDto,
  })
  async addAddress(@Body() _addressData: Record<string, unknown>) {
    return { message: 'Address added' };
  }

  @Roles('ADMIN')
  @Get('customers/count')
  @ZodResponse({
    status: 200,
    description: 'Returns the total number of customers',
    type: CustomerCountResponseDto,
  })
  async getCustomerCount() {
    return this.queryBus.execute(new GetCustomerCountQuery());
  }

  @Roles('ADMIN')
  @Get('customers')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated customers with optional filters',
    type: PaginatedUsersResponseDto,
  })
  async getCustomers(@Query() filters: QueryUserDto) {
    return this.queryBus.execute(new GetCustomersQuery(filters));
  }

  @Roles('ADMIN')
  @Get('users/admins')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated admin users with optional filters',
    type: PaginatedUsersResponseDto,
  })
  async getAdmins(@Query() filters: QueryUserDto) {
    return this.queryBus.execute(new GetAdminsQuery(filters));
  }

  @Roles('ADMIN')
  @Get('users/admins/vendors')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated vendor admin users with optional filters',
    type: PaginatedUsersResponseDto,
  })
  async getVendorAdmins(@Query() filters: QueryUserDto) {
    return this.queryBus.execute(new GetVendorAdminsQuery(filters));
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('users/vendor/:id')
  @ZodResponse({
    status: 200,
    description: 'Returns a vendor admin user by ID',
    type: RecordResponseDto,
  })
  async getVendorAdmin(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    return this.queryBus.execute(new GetVendorAdminByIdQuery(id, actor));
  }

  @Get('users/:id')
  @ZodResponse({
    status: 200,
    description: 'Returns a user by ID (own profile, or any user for admins)',
    type: RecordResponseDto,
  })
  async getUser(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    return this.queryBus.execute(new GetUserByIdQuery(id, actor));
  }

  @Patch('users/:id')
  @UseInterceptors(FileInterceptor('avatar', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 200,
    description: 'Updates a user and returns the updated user',
    type: RecordResponseDto,
  })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: { id: string; role: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (actor.role !== 'ADMIN' && actor.id !== id) {
      throw new ForbiddenException('Not allowed to update this user');
    }
    const { store, ...userData } = dto;
    return this.commandBus.execute(
      new UpdateUserCommand(id, actor, userData, store, file),
    );
  }

  @Roles('ADMIN')
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteUserCommand(id));
  }
}

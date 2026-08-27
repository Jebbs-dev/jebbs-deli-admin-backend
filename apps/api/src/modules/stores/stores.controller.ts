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
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@shared/features/auth/decorators/public.decorator';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { AccessService } from '@shared/features/auth/access.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { QueryStoreDto } from './dto/query-store.dto';
import { CreateStoreCommand } from './command/create-store';
import { UpdateStoreCommand } from './command/update-store';
import { DeleteStoreCommand } from './command/delete-store';
import { GetStoreByIdQuery } from './query/get-store-by-id';
import { GetStoresQuery } from './query/get-stores';
import { GetStoreCountQuery } from './query/get-store-count';
import {
  PaginatedStoresResponseDto,
  RecordResponseDto,
  StoreCountResponseDto,
} from '@shared/system/common/schemas/response.schemas';

@Controller(['store', 'v1/stores'])
export class StoresController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly access: AccessService,
  ) {}

  @Roles('ADMIN', 'VENDOR')
  @Post()
  @UseInterceptors(FileInterceptor('logo', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 201,
    description: 'Creates a new store and returns the created store',
    type: RecordResponseDto,
  })
  async createV1(
    @Body() dto: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    return this.commandBus.execute(new CreateStoreCommand(actor, dto, file));
  }

  @Roles('ADMIN', 'VENDOR')
  @Post('register')
  @UseInterceptors(FileInterceptor('logo', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 201,
    description: 'Registers a new store and returns the created store',
    type: RecordResponseDto,
  })
  async create(
    @Body() dto: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    return this.commandBus.execute(new CreateStoreCommand(actor, dto, file));
  }

  @Public()
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns paginated stores with optional filters',
    type: PaginatedStoresResponseDto,
  })
  async findAll(
    @Query() filters: QueryStoreDto,
    @CurrentUser() user?: { id: string; role: string },
  ) {
    return this.queryBus.execute(
      new GetStoresQuery(filters, user?.role === 'ADMIN'),
    );
  }

  @Roles('ADMIN')
  @Get('count')
  @ZodResponse({
    status: 200,
    description: 'Returns the total number of stores',
    type: StoreCountResponseDto,
  })
  async count() {
    return this.queryBus.execute(new GetStoreCountQuery());
  }

  @Roles('ADMIN', 'VENDOR')
  @Get(':id/manage')
  @ZodResponse({
    status: 200,
    description: 'Returns a store including payout fields for the owner or admin',
    type: RecordResponseDto,
  })
  async manage(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    await this.access.assertStoreAccess(id, actor);
    return this.queryBus.execute(new GetStoreByIdQuery(id, true));
  }

  @Public()
  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns a store by ID without payout secrets',
    type: RecordResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetStoreByIdQuery(id, false, true));
  }

  @Roles('ADMIN', 'VENDOR')
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files', 2, { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 200,
    description: 'Updates a store and returns the updated store',
    type: RecordResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    const billboardFile = files?.[0];
    const logoFile = files?.[1];
    return this.commandBus.execute(
      new UpdateStoreCommand(id, actor, dto, billboardFile, logoFile),
    );
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: { id: string; role: string },
  ) {
    await this.commandBus.execute(new DeleteStoreCommand(id, actor));
  }
}

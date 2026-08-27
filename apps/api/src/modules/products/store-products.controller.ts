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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@shared/features/auth/decorators/public.decorator';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { AccessService, type Actor } from '@shared/features/auth/access.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductCommand } from './command/create-product';
import { UpdateProductCommand } from './command/update-product';
import { DeleteProductCommand } from './command/delete-product';
import { GetProductByStoreQuery } from './query/get-product-by-store';
import { GetFilteredProductsByStoreQuery } from './query/get-filtered-products-by-store';
import { GetProductsCountQuery } from './query/get-products-count';
import {
  PaginatedProductsResponseDto,
  ProductCountResponseDto,
  RecordResponseDto,
} from '@shared/system/common/schemas/response.schemas';

@Controller('v1/stores/:storeId/products')
export class StoreProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly access: AccessService,
  ) {}

  @Roles('ADMIN', 'VENDOR')
  @Post()
  @UseInterceptors(
    FileInterceptor('image', { storage: diskStorage({ destination: './uploads' }) }),
  )
  @ZodResponse({
    status: 201,
    description: 'Creates a product in the store catalog',
    type: RecordResponseDto,
  })
  async create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: Actor,
  ) {
    return this.commandBus.execute(
      new CreateProductCommand(actor, dto, file, storeId),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('count')
  @ZodResponse({
    status: 200,
    description: 'Returns the product count for a store',
    type: ProductCountResponseDto,
  })
  async count(
    @Param('storeId') storeId: string,
    @CurrentUser() actor: Actor,
  ) {
    await this.access.assertStoreAccess(storeId, actor);
    return this.queryBus.execute(new GetProductsCountQuery(storeId));
  }

  @Public()
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns paginated products for a store',
    type: PaginatedProductsResponseDto,
  })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query() filters: QueryProductDto,
    @CurrentUser() user?: Actor,
  ) {
    const staff = await this.access.canAccessStore(storeId, user);
    return this.queryBus.execute(
      new GetFilteredProductsByStoreQuery(storeId, filters, !staff),
    );
  }

  @Public()
  @Get(':productId')
  @ZodResponse({
    status: 200,
    description: 'Returns a product in a store',
    type: RecordResponseDto,
  })
  async findOne(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.queryBus.execute(new GetProductByStoreQuery(productId, storeId));
  }

  @Roles('ADMIN', 'VENDOR')
  @Patch(':productId')
  @UseInterceptors(
    FileInterceptor('image', { storage: diskStorage({ destination: './uploads' }) }),
  )
  @ZodResponse({
    status: 200,
    description: 'Updates a product in a store',
    type: RecordResponseDto,
  })
  async update(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: Actor,
  ) {
    await this.access.assertStoreAccess(storeId, actor);
    const ownedStoreId = await this.access.assertProductStoreAccess(
      productId,
      actor,
    );
    if (ownedStoreId !== storeId) {
      throw new BadRequestException('Product does not belong to this store');
    }
    return this.commandBus.execute(
      new UpdateProductCommand(actor, productId, dto, file),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentUser() actor: Actor,
  ) {
    await this.access.assertStoreAccess(storeId, actor);
    const ownedStoreId = await this.access.assertProductStoreAccess(
      productId,
      actor,
    );
    if (ownedStoreId !== storeId) {
      throw new BadRequestException('Product does not belong to this store');
    }
    await this.commandBus.execute(new DeleteProductCommand(actor, productId));
  }
}

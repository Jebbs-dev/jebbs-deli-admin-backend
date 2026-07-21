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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '@libs/shared/features/auth/decorators/public.decorator';
import { Roles } from '@libs/shared/features/auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductCommand } from './command/create-product';
import { UpdateProductCommand } from './command/update-product';
import { DeleteProductCommand } from './command/delete-product';
import { GetProductByIdQuery } from './query/get-product-by-id';
import { GetProductByStoreQuery } from './query/get-product-by-store';
import { GetFilteredProductsQuery } from './query/get-filtered-products';
import { GetFilteredProductsByStoreQuery } from './query/get-filtered-products-by-store';
import { GetProductsCountQuery } from './query/get-products-count';
import {
  PaginatedProductsResponseDto,
  ProductCountResponseDto,
  RecordResponseDto,
} from '@libs/shared/system/common/schemas/response.schemas';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Roles('ADMIN', 'VENDOR')
  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 201,
    description: 'Creates a new product and returns the created product',
    type: RecordResponseDto,
  })
  async create(@Body() dto: CreateProductDto, @UploadedFile() file?: Express.Multer.File) {
    return this.commandBus.execute(new CreateProductCommand(dto, file));
  }

  @Public()
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns paginated products with optional filters',
    type: PaginatedProductsResponseDto,
  })
  async findAll(@Query() filters: QueryProductDto) {
    return this.queryBus.execute(new GetFilteredProductsQuery(filters));
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId/count')
  @ZodResponse({
    status: 200,
    description: 'Returns the product count for a specific store',
    type: ProductCountResponseDto,
  })
  async countByStore(@Param('storeId') storeId: string) {
    return this.queryBus.execute(new GetProductsCountQuery(storeId));
  }

  @Public()
  @Get('store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated products for a specific store',
    type: PaginatedProductsResponseDto,
  })
  async findByStore(@Param('storeId') storeId: string, @Query() filters: QueryProductDto) {
    return this.queryBus.execute(new GetFilteredProductsByStoreQuery(storeId, filters));
  }

  @Public()
  @Get(':id/store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns a product by ID within a specific store',
    type: RecordResponseDto,
  })
  async findOneByStore(@Param('id') id: string, @Param('storeId') storeId: string) {
    return this.queryBus.execute(new GetProductByStoreQuery(id, storeId));
  }

  @Public()
  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns a product by ID',
    type: RecordResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetProductByIdQuery(id));
  }

  @Roles('ADMIN', 'VENDOR')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', { storage: diskStorage({ destination: './uploads' }) }))
  @ZodResponse({
    status: 200,
    description: 'Updates a product and returns the updated product',
    type: RecordResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.commandBus.execute(new UpdateProductCommand(id, dto, file));
  }

  @Roles('ADMIN', 'VENDOR')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteProductCommand(id));
  }
}

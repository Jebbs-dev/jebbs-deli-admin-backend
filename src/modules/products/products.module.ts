import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsController } from './products.controller';
import { CreateProductHandler } from './command/create-product';
import { UpdateProductHandler } from './command/update-product';
import { DeleteProductHandler } from './command/delete-product';
import { GetProductByIdHandler } from './query/get-product-by-id';
import { GetProductByStoreHandler } from './query/get-product-by-store';
import { GetProductsByStoreHandler } from './query/get-products-by-store';
import { GetFilteredProductsHandler } from './query/get-filtered-products';
import { GetFilteredProductsByStoreHandler } from './query/get-filtered-products-by-store';
import { GetProductsCountHandler } from './query/get-products-count';

const CommandHandlers = [CreateProductHandler, UpdateProductHandler, DeleteProductHandler];
const QueryHandlers = [
  GetProductByIdHandler,
  GetProductByStoreHandler,
  GetProductsByStoreHandler,
  GetFilteredProductsHandler,
  GetFilteredProductsByStoreHandler,
  GetProductsCountHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [ProductsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class ProductsModule {}

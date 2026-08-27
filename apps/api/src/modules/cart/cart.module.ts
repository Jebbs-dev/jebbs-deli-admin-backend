import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CartController } from './cart.controller';
import { CreateCartHandler } from './command/create-cart';
import { UpdateCartHandler } from './command/update-cart';
import { UpsertCartItemHandler } from './command/upsert-cart-item';
import { DeleteCartHandler } from './command/delete-cart';
import { GetCartHandler } from './query/get-cart';

const CommandHandlers = [
  CreateCartHandler,
  UpdateCartHandler,
  UpsertCartItemHandler,
  DeleteCartHandler,
];
const QueryHandlers = [GetCartHandler];

@Module({
  imports: [CqrsModule],
  controllers: [CartController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class CartModule {}

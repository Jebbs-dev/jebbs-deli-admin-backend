import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { CreateOrderHandler } from './command/create-order';
import { UpdateOrderHandler } from './command/update-order';
import { DeleteOrderHandler } from './command/delete-order';
import { GetOrderByIdHandler } from './query/get-order-by-id';
import { GetOrdersHandler } from './query/get-orders';
import { GetOrdersByUserHandler } from './query/get-orders-by-user';
import { GetOrdersByStoreHandler } from './query/get-orders-by-store';
import { GetOrdersCountHandler } from './query/get-orders-count';
import { GetOrdersCountByStoreHandler } from './query/get-orders-count-by-store';
import { WalletModule } from '../wallet/wallet.module';

const CommandHandlers = [CreateOrderHandler, UpdateOrderHandler, DeleteOrderHandler];
const QueryHandlers = [
  GetOrderByIdHandler,
  GetOrdersHandler,
  GetOrdersByUserHandler,
  GetOrdersByStoreHandler,
  GetOrdersCountHandler,
  GetOrdersCountByStoreHandler,
];

@Module({
  imports: [CqrsModule, WalletModule],
  controllers: [OrdersController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class OrdersModule {}

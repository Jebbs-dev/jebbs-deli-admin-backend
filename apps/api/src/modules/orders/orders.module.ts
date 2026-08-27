import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { StoreOrdersController } from './store-orders.controller';
import { CreateOrderHandler } from './command/create-order';
import { QuoteOrderHandler } from './command/quote-order';
import { UpdateOrderHandler } from './command/update-order';
import { DeleteOrderHandler } from './command/delete-order';
import { TransitionOrderHandler } from './command/transition-order';
import { GetOrderByIdHandler } from './query/get-order-by-id';
import { GetOrdersHandler } from './query/get-orders';
import { GetOrdersByUserHandler } from './query/get-orders-by-user';
import { GetOrdersByStoreHandler } from './query/get-orders-by-store';
import { GetOrdersCountHandler } from './query/get-orders-count';
import { GetOrdersCountByStoreHandler } from './query/get-orders-count-by-store';
import { OrderStatusService } from './services/order-status.service';
import { OrderAccessService } from './services/order-access.service';
import { FeeEngineService } from './services/fee-engine.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { AuthModule } from '@shared/features/auth/auth.module';

const CommandHandlers = [
  CreateOrderHandler,
  QuoteOrderHandler,
  UpdateOrderHandler,
  DeleteOrderHandler,
  TransitionOrderHandler,
];
const QueryHandlers = [
  GetOrderByIdHandler,
  GetOrdersHandler,
  GetOrdersByUserHandler,
  GetOrdersByStoreHandler,
  GetOrdersCountHandler,
  GetOrdersCountByStoreHandler,
];

@Module({
  imports: [CqrsModule, WalletModule, AuthModule, forwardRef(() => SettlementModule)],
  controllers: [OrdersController, StoreOrdersController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    OrderStatusService,
    OrderAccessService,
    FeeEngineService,
  ],
  exports: [OrderStatusService, OrderAccessService, FeeEngineService],
})
export class OrdersModule {}

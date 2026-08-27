import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { QueryOrderDto } from './dto/query-order.dto';
import { GetOrdersByStoreQuery } from './query/get-orders-by-store';
import { GetOrdersCountByStoreQuery } from './query/get-orders-count-by-store';
import { OrderAccessService } from './services/order-access.service';
import {
  OrdersCountResponseDto,
  PaginatedOrdersResponseDto,
} from '@shared/system/common/schemas/response.schemas';

@Controller('v1/stores/:storeId/orders')
export class StoreOrdersController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly orderAccess: OrderAccessService,
  ) {}

  @Roles('ADMIN', 'VENDOR')
  @Get('count')
  @ZodResponse({
    status: 200,
    description: 'Returns the order count for a store',
    type: OrdersCountResponseDto,
  })
  async count(
    @Param('storeId') storeId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.assertStoreAccess(storeId, user);
    return this.queryBus.execute(new GetOrdersCountByStoreQuery(storeId));
  }

  @Roles('ADMIN', 'VENDOR')
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for a store',
    type: PaginatedOrdersResponseDto,
  })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query() filters: QueryOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.assertStoreAccess(storeId, user);
    return this.queryBus.execute(new GetOrdersByStoreQuery(storeId, filters));
  }
}

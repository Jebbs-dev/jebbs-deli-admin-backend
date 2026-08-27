import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import {
  AssignRiderDto,
  CreateOrderDto,
  QuoteOrderDto,
  TransitionOrderDto,
  UpdateOrderBodyDto,
} from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CreateOrderCommand } from './command/create-order';
import { QuoteOrderCommand } from './command/quote-order';
import { UpdateOrderCommand } from './command/update-order';
import { DeleteOrderCommand } from './command/delete-order';
import { TransitionOrderCommand } from './command/transition-order';
import { AssignRiderCommand } from '../deliveries/command/delivery-actions';
import { GetOrderByIdQuery } from './query/get-order-by-id';
import { GetOrdersQuery } from './query/get-orders';
import { GetOrdersByUserQuery } from './query/get-orders-by-user';
import { GetOrdersByStoreQuery } from './query/get-orders-by-store';
import { GetOrdersCountQuery } from './query/get-orders-count';
import { GetOrdersCountByStoreQuery } from './query/get-orders-count-by-store';
import { OrderAccessService } from './services/order-access.service';
import { OrderStatus } from '@generated/prisma/client';
import {
  OrdersCountResponseDto,
  PaginatedOrdersResponseDto,
  RecordResponseDto,
} from '@shared/system/common/schemas/response.schemas';

@Controller(['orders', 'v1/orders'])
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly orderAccess: OrderAccessService,
  ) {}

  @Post()
  @Roles('USER', 'ADMIN')
  @ZodResponse({
    status: 201,
    description: 'Creates a new order and returns the created order',
    type: RecordResponseDto,
  })
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new CreateOrderCommand(
        user.id,
        dto.storeId,
        dto.fulfillmentType,
        dto.vendorAddress ?? '',
        dto.customerAddress ?? '',
        dto.orderItems,
        dto.paymentMethod,
        {
          serviceFee: dto.serviceFee,
          deliveryFee: dto.deliveryFee,
          subTotal: dto.subTotal,
          totalPrice: dto.totalPrice,
        },
      ),
    );
  }

  @Post('quote')
  @Roles('USER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Quotes fees for a cart without creating an order',
    type: RecordResponseDto,
  })
  async quote(@Body() dto: QuoteOrderDto) {
    return this.commandBus.execute(
      new QuoteOrderCommand(dto.storeId, dto.fulfillmentType, dto.orderItems),
    );
  }

  @Roles('ADMIN')
  @Get('count')
  @ZodResponse({
    status: 200,
    description: 'Returns the total order count across all stores',
    type: OrdersCountResponseDto,
  })
  async count() {
    return this.queryBus.execute(new GetOrdersCountQuery());
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId/count')
  @ZodResponse({
    status: 200,
    description: 'Returns the order count for a specific store',
    type: OrdersCountResponseDto,
  })
  async countByStore(
    @Param('storeId') storeId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.assertStoreAccess(storeId, user);
    return this.queryBus.execute(new GetOrdersCountByStoreQuery(storeId));
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for a specific store',
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

  @Get('me')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for the authenticated user',
    type: PaginatedOrdersResponseDto,
  })
  async findMine(
    @Query() filters: QueryOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.queryBus.execute(new GetOrdersByUserQuery(user.id, filters));
  }

  @Get('user/:userId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for a specific user',
    type: PaginatedOrdersResponseDto,
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() filters: QueryOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.assertUserOwnsOrders(userId, user);
    return this.queryBus.execute(new GetOrdersByUserQuery(userId, filters));
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns a single order by ID',
    type: RecordResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.orderAccess.getOrderForActor(id, user);
  }

  @Roles('ADMIN')
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders with optional filters',
    type: PaginatedOrdersResponseDto,
  })
  async findAll(@Query() filters: QueryOrderDto) {
    return this.queryBus.execute(new GetOrdersQuery(filters));
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/confirm')
  async confirm(
    @Param('id') id: string,
    @Body() body: TransitionOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new TransitionOrderCommand(id, OrderStatus.confirmed, user, body.note),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/preparing')
  async preparing(
    @Param('id') id: string,
    @Body() body: TransitionOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new TransitionOrderCommand(id, OrderStatus.preparing, user, body.note),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/ready')
  async ready(
    @Param('id') id: string,
    @Body() body: TransitionOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new TransitionOrderCommand(id, OrderStatus.ready, user, body.note),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/complete-pickup')
  async completePickup(
    @Param('id') id: string,
    @Body() body: TransitionOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new TransitionOrderCommand(id, OrderStatus.delivered, user, body.note),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: TransitionOrderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new TransitionOrderCommand(id, OrderStatus.cancelled, user, body.note),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() body: AssignRiderDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new AssignRiderCommand(id, body.riderId, user),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Put(':id')
  @ZodResponse({
    status: 200,
    description: 'Updates an order (non-status fields). Prefer status endpoints.',
    type: RecordResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateOrderBodyDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    const { status: _status, ...safeData } = (body.orderData ?? {}) as Record<
      string,
      unknown
    > & { status?: unknown };
    return this.commandBus.execute(
      new UpdateOrderCommand(id, user, safeData, body.orderItems || []),
    );
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteOrderCommand(id));
  }
}

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

import { Roles } from '@libs/shared/features/auth/decorators/roles.decorator';
import { CreateOrderDto, UpdateOrderBodyDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CreateOrderCommand } from './command/create-order';
import { UpdateOrderCommand } from './command/update-order';
import { DeleteOrderCommand } from './command/delete-order';
import { GetOrderByIdQuery } from './query/get-order-by-id';
import { GetOrdersQuery } from './query/get-orders';
import { GetOrdersByUserQuery } from './query/get-orders-by-user';
import { GetOrdersByStoreQuery } from './query/get-orders-by-store';
import { GetOrdersCountQuery } from './query/get-orders-count';
import { GetOrdersCountByStoreQuery } from './query/get-orders-count-by-store';
import {
  OrdersCountResponseDto,
  PaginatedOrdersResponseDto,
  RecordResponseDto,
} from '@libs/shared/system/common/schemas/response.schemas';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ZodResponse({
    status: 201,
    description: 'Creates a new order and returns the created order',
    type: RecordResponseDto,
  })
  async create(@Body() dto: CreateOrderDto) {
    const { orderItems, paymentMethod, ...orderData } = dto;
    return this.commandBus.execute(
      new CreateOrderCommand(
        orderData,
        (orderItems || []) as Array<{
          productId: string;
          quantity: number;
          storeId?: string;
        }>,
        paymentMethod,
      ),
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
  async countByStore(@Param('storeId') storeId: string) {
    return this.queryBus.execute(new GetOrdersCountByStoreQuery(storeId));
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for a specific store',
    type: PaginatedOrdersResponseDto,
  })
  async findByStore(@Param('storeId') storeId: string, @Query() filters: QueryOrderDto) {
    return this.queryBus.execute(new GetOrdersByStoreQuery(storeId, filters));
  }

  @Get('user/:userId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated orders for a specific user',
    type: PaginatedOrdersResponseDto,
  })
  async findByUser(@Param('userId') userId: string, @Query() filters: QueryOrderDto) {
    return this.queryBus.execute(new GetOrdersByUserQuery(userId, filters));
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns a single order by ID',
    type: RecordResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetOrderByIdQuery(id));
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
  @Put(':id')
  @ZodResponse({
    status: 200,
    description: 'Updates an order and returns the updated order',
    type: RecordResponseDto,
  })
  async update(@Param('id') id: string, @Body() body: UpdateOrderBodyDto) {
    return this.commandBus.execute(new UpdateOrderCommand(id, body.orderData, body.orderItems || []));
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.commandBus.execute(new DeleteOrderCommand(id));
  }
}

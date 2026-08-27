import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';

import {
  AddToCartDto,
  UpdateCartBodyDto,
  UpsertCartItemDto,
} from './dto/cart-item.dto';
import { CreateCartCommand } from './command/create-cart';
import { UpdateCartCommand } from './command/update-cart';
import { UpsertCartItemCommand } from './command/upsert-cart-item';
import { DeleteCartCommand } from './command/delete-cart';
import { GetCartQuery } from './query/get-cart';
import { RecordResponseDto } from '@shared/system/common/schemas/response.schemas';

@Controller(['cart', 'v1/cart'])
export class CartController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ZodResponse({
    status: 201,
    description: 'Adds items to the cart and returns the created cart',
    type: RecordResponseDto,
  })
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.commandBus.execute(
      new CreateCartCommand(userId, null, dto.cartItems, dto.totalPrice ?? 0),
    );
  }

  /** Incremental qty set / remove (quantity 0 deletes the line). */
  @Patch('items')
  @ZodResponse({
    status: 200,
    description: 'Upserts a single cart line and returns the updated cart',
    type: RecordResponseDto,
  })
  async upsertItem(
    @CurrentUser('id') userId: string,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.commandBus.execute(
      new UpsertCartItemCommand(
        userId,
        dto.productId,
        dto.storeId,
        dto.quantity,
      ),
    );
  }

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns the authenticated user cart',
    type: RecordResponseDto,
  })
  async getCartForSession(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetCartQuery(userId));
  }

  @Get('me')
  @ZodResponse({
    status: 200,
    description: 'Returns the authenticated user cart',
    type: RecordResponseDto,
  })
  async getMyCart(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetCartQuery(userId));
  }

  @Get(':userId')
  @ZodResponse({
    status: 200,
    description: 'Returns the cart for the specified user (own cart only)',
    type: RecordResponseDto,
  })
  async getCart(
    @CurrentUser('id') authUserId: string,
    @Param('userId') userId: string,
  ) {
    if (authUserId !== userId) {
      throw new ForbiddenException('Cannot access another user cart');
    }
    return this.queryBus.execute(new GetCartQuery(userId));
  }

  @Put(':id')
  @ZodResponse({
    status: 200,
    description: 'Replaces the full cart snapshot (legacy / clear-all)',
    type: RecordResponseDto,
  })
  async updateCart(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateCartBodyDto,
  ) {
    return this.commandBus.execute(
      new UpdateCartCommand(id, userId, body.cartData, body.cartItems),
    );
  }

  @Delete(':id')
  @ZodResponse({
    status: 200,
    description: 'Deletes the cart and returns the deleted cart',
    type: RecordResponseDto,
  })
  async deleteCart(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.commandBus.execute(new DeleteCartCommand(id, userId));
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { AddToCartDto, UpdateCartBodyDto } from './dto/cart-item.dto';
import { CreateCartCommand } from './command/create-cart';
import { UpdateCartCommand } from './command/update-cart';
import { DeleteCartCommand } from './command/delete-cart';
import { GetCartQuery } from './query/get-cart';
import { RecordResponseDto } from '@libs/shared/system/common/schemas/response.schemas';

@Controller('cart')
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
  async addToCart(@Body() dto: AddToCartDto, @Req() req: { user?: { id?: string }; session?: { cartId?: string } }) {
    return this.commandBus.execute(
      new CreateCartCommand(
        req.user?.id || null,
        dto.userId ? null : req.session?.cartId || null,
        dto.cartItems,
        dto.totalPrice,
      ),
    );
  }

  @Get(':userId')
  @ZodResponse({
    status: 200,
    description: 'Returns the cart for the specified user',
    type: RecordResponseDto,
  })
  async getCart(@Param('userId') userId: string) {
    return this.queryBus.execute(new GetCartQuery(userId));
  }

  @Put(':id')
  @ZodResponse({
    status: 200,
    description: 'Updates the cart and returns the updated cart',
    type: RecordResponseDto,
  })
  async updateCart(@Param('id') id: string, @Body() body: UpdateCartBodyDto) {
    return this.commandBus.execute(new UpdateCartCommand(id, body.cartData, body.cartItems));
  }

  @Delete(':id')
  @ZodResponse({
    status: 200,
    description: 'Deletes the cart and returns the deleted cart',
    type: RecordResponseDto,
  })
  async deleteCart(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteCartCommand(id));
  }
}

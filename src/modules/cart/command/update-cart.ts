import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import {
  cartWithItemsInclude,
  computeCartTotal,
} from '../cart.helpers';

export class UpdateCartCommand {
  constructor(
    public readonly cartId: string,
    public readonly userId: string,
    public readonly cartData: { totalPrice?: number },
    public readonly cartItems?: Array<{
      productId: string;
      quantity: number;
      storeId: string;
    }>,
  ) {}
}

function groupItemsByStore(
  cartItems: Array<{ productId: string; quantity: number; storeId: string }>,
): Record<string, typeof cartItems> {
  const itemsByStore: Record<string, typeof cartItems> = {};
  for (const item of cartItems) {
    if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
    itemsByStore[item.storeId].push(item);
  }
  return itemsByStore;
}

@CommandHandler(UpdateCartCommand)
export class UpdateCartHandler implements ICommandHandler<UpdateCartCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateCartCommand) {
    const { cartId, userId, cartItems } = command;
    const existing = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!existing) {
      throw new NotFoundException('Cart not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('Cannot update another user cart');
    }

    // Explicit undefined = no change to items; [] = clear cart.
    if (cartItems === undefined) {
      return this.prisma.cart.findUniqueOrThrow({
        where: { id: cartId },
        include: cartWithItemsInclude,
      });
    }

    const itemsByStore =
      cartItems.length > 0 ? groupItemsByStore(cartItems) : {};

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        cartGroups: {
          deleteMany: {},
          create: Object.entries(itemsByStore).map(([storeId, storeItems]) => ({
            storeId,
            cartItems: {
              create: storeItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          })),
        },
      },
    });

    const updated = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: cartWithItemsInclude,
    });

    return this.prisma.cart.update({
      where: { id: cartId },
      data: { totalPrice: computeCartTotal(updated) },
      include: cartWithItemsInclude,
    });
  }
}

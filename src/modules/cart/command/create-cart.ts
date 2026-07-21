import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class CreateCartCommand {
  constructor(
    public readonly userId: string | null,
    public readonly sessionId: string | null,
    public readonly cartItems: any[],
    public readonly totalPrice: number,
  ) {}
}

function groupItemsByStore(cartItems: any[]): Record<string, any[]> {
  const itemsByStore: Record<string, any[]> = {};
  for (const item of cartItems) {
    if (!item.storeId) throw new BadRequestException('Each cart item must have a storeId');
    if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
    itemsByStore[item.storeId].push(item);
  }
  return itemsByStore;
}

@CommandHandler(CreateCartCommand)
export class CreateCartHandler implements ICommandHandler<CreateCartCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateCartCommand) {
    const { userId, sessionId, cartItems, totalPrice } = command;

    if (!userId && !sessionId) {
      throw new BadRequestException('Either userId or sessionId must be provided');
    }

    let cart: any;

    if (userId) {
      cart = await this.prisma.cart.findUnique({ where: { userId }, include: { cartGroups: true } });
      if (cart) {
        cart = await this.prisma.cart.update({
          where: { userId },
          data: { totalPrice, updatedAt: new Date() },
          include: { cartGroups: true },
        });
      } else {
        cart = await this.prisma.cart.create({
          data: { userId, totalPrice },
          include: { cartGroups: true },
        });
      }
    } else if (sessionId) {
      cart = await this.prisma.cart.findUnique({ where: { sessionId }, include: { cartGroups: true } });
      if (cart) {
        cart = await this.prisma.cart.update({
          where: { sessionId },
          data: { totalPrice, updatedAt: new Date() },
          include: { cartGroups: true },
        });
      } else {
        cart = await this.prisma.cart.create({
          data: { sessionId, totalPrice },
          include: { cartGroups: true },
        });
      }
    }

    if (cartItems && cartItems.length > 0) {
      const itemsByStore = groupItemsByStore(cartItems);
      for (const [storeId, items] of Object.entries(itemsByStore)) {
        let cartStoreGroup = await this.prisma.cartStoreGroup.findFirst({
          where: { cartId: cart.id, storeId },
        });
        if (cartStoreGroup) {
          await this.prisma.cartItem.deleteMany({ where: { cartStoreGroupId: cartStoreGroup.id } });
          cartStoreGroup = await this.prisma.cartStoreGroup.update({
            where: { id: cartStoreGroup.id },
            data: { updatedAt: new Date() },
          });
        } else {
          cartStoreGroup = await this.prisma.cartStoreGroup.create({
            data: { cartId: cart.id, storeId },
          });
        }
        for (const item of items) {
          await this.prisma.cartItem.create({
            data: {
              cartStoreGroupId: cartStoreGroup.id,
              productId: item.productId,
              quantity: item.quantity || 1,
            },
          });
        }
      }
    }

    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        cartGroups: {
          include: {
            store: true,
            cartItems: { include: { product: true } },
          },
        },
        user: true,
      },
    });
  }
}

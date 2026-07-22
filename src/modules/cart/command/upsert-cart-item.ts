import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import {
  cartWithItemsInclude,
  computeCartTotal,
} from '../cart.helpers';

export class UpsertCartItemCommand {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
    public readonly storeId: string,
    public readonly quantity: number,
  ) {}
}

@CommandHandler(UpsertCartItemCommand)
export class UpsertCartItemHandler
  implements ICommandHandler<UpsertCartItemCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpsertCartItemCommand) {
    const { userId, productId, storeId, quantity } = command;

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('Quantity must be a non-negative integer');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, storeId: true, isAvailable: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.storeId !== storeId) {
      throw new BadRequestException('Product does not belong to this store');
    }
    if (!product.isAvailable && quantity > 0) {
      throw new BadRequestException('Product is unavailable');
    }

    return this.prisma.$transaction(async (tx) => {
      let cart = await tx.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await tx.cart.create({ data: { userId, totalPrice: 0 } });
      }

      if (quantity === 0) {
        const group = await tx.cartStoreGroup.findUnique({
          where: { cartId_storeId: { cartId: cart.id, storeId } },
        });
        if (group) {
          await tx.cartItem.deleteMany({
            where: { cartStoreGroupId: group.id, productId },
          });
          const remaining = await tx.cartItem.count({
            where: { cartStoreGroupId: group.id },
          });
          if (remaining === 0) {
            await tx.cartStoreGroup.delete({ where: { id: group.id } });
          }
        }
      } else {
        const group = await tx.cartStoreGroup.upsert({
          where: { cartId_storeId: { cartId: cart.id, storeId } },
          create: { cartId: cart.id, storeId },
          update: {},
        });

        await tx.cartItem.upsert({
          where: {
            cartStoreGroupId_productId: {
              cartStoreGroupId: group.id,
              productId,
            },
          },
          create: {
            cartStoreGroupId: group.id,
            productId,
            quantity,
          },
          update: { quantity },
        });
      }

      const withItems = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: cartWithItemsInclude,
      });

      return tx.cart.update({
        where: { id: cart.id },
        data: { totalPrice: computeCartTotal(withItems) },
        include: cartWithItemsInclude,
      });
    });
  }
}

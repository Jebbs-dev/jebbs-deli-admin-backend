import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class UpdateCartCommand {
  constructor(
    public readonly cartId: string,
    public readonly cartData: Record<string, any>,
    public readonly cartItems?: any[],
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

@CommandHandler(UpdateCartCommand)
export class UpdateCartHandler implements ICommandHandler<UpdateCartCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateCartCommand) {
    const { cartId, cartData, cartItems } = command;

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { ...cartData, updatedAt: new Date() },
    });

    if (!cartItems || cartItems.length === 0) {
      const groups = await this.prisma.cartStoreGroup.findMany({ where: { cartId } });
      for (const group of groups) {
        await this.prisma.cartItem.deleteMany({ where: { cartStoreGroupId: group.id } });
      }
      await this.prisma.cartStoreGroup.deleteMany({ where: { cartId } });
    } else {
      const existingGroups = await this.prisma.cartStoreGroup.findMany({ where: { cartId } });
      const itemsByStore = groupItemsByStore(cartItems);
      const updatedStoreIds = Object.keys(itemsByStore);

      for (const group of existingGroups) {
        if (!updatedStoreIds.includes(group.storeId)) {
          await this.prisma.cartItem.deleteMany({ where: { cartStoreGroupId: group.id } });
          await this.prisma.cartStoreGroup.delete({ where: { id: group.id } });
        }
      }

      for (const [storeId, items] of Object.entries(itemsByStore)) {
        if (items.length === 0) continue;
        let cartStoreGroup = await this.prisma.cartStoreGroup.findFirst({
          where: { cartId, storeId },
        });
        if (cartStoreGroup) {
          await this.prisma.cartItem.deleteMany({ where: { cartStoreGroupId: cartStoreGroup.id } });
          cartStoreGroup = await this.prisma.cartStoreGroup.update({
            where: { id: cartStoreGroup.id },
            data: { updatedAt: new Date() },
          });
        } else {
          cartStoreGroup = await this.prisma.cartStoreGroup.create({
            data: { cartId, storeId },
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
      where: { id: cartId },
      include: {
        cartGroups: {
          include: { store: true, cartItems: { include: { product: true } } },
        },
        user: true,
      },
    });
  }
}

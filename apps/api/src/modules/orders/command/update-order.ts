import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';

const ALLOWED_ORDER_FIELDS = new Set(['vendorAddress', 'customerAddress']);

export class UpdateOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly actor: Actor,
    public readonly orderData: Record<string, unknown>,
    public readonly orderItems: Array<Record<string, unknown>>,
  ) {}
}

@CommandHandler(UpdateOrderCommand)
export class UpdateOrderHandler implements ICommandHandler<UpdateOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async execute(command: UpdateOrderCommand) {
    const { orderId, actor, orderData, orderItems } = command;
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { storeId: true, status: true },
    });
    if (!existing) {
      throw new BadRequestException('Order not found');
    }
    if (existing.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be updated');
    }
    await this.access.assertStoreAccess(existing.storeId, actor);

    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(orderData ?? {})) {
      if (ALLOWED_ORDER_FIELDS.has(key) && value !== undefined) {
        safeData[key] = value;
      }
    }

    const items =
      orderItems.length > 0
        ? await Promise.all(
            orderItems.map(async (item) => {
              const product = await this.prisma.product.findUniqueOrThrow({
                where: { id: String(item.productId) },
                select: { name: true, price: true, storeId: true },
              });
              await this.access.assertStoreAccess(product.storeId, actor);
              return {
                storeId: product.storeId,
                productId: String(item.productId),
                quantity: Number(item.quantity),
                productName: product.name,
                unitPrice: product.price,
              };
            }),
          )
        : null;

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...safeData,
        ...(items
          ? {
              orderItems: {
                deleteMany: {},
                create: items,
              },
            }
          : {}),
      },
    });
  }
}

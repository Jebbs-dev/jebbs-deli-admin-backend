import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class UpdateOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly orderData: Record<string, any>,
    public readonly orderItems: any[],
  ) {}
}

@CommandHandler(UpdateOrderCommand)
export class UpdateOrderHandler implements ICommandHandler<UpdateOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateOrderCommand) {
    const { orderId, orderData, orderItems } = command;
    const items = await Promise.all(
      orderItems.map(async (item) => {
        const product = await this.prisma.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { name: true, price: true },
        });
        return {
          storeId: item.storeId ?? orderData.storeId,
          productId: item.productId,
          quantity: item.quantity,
          productName: product.name,
          unitPrice: product.price,
        };
      }),
    );

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...orderData,
        orderItems: {
          deleteMany: {},
          create: items,
        },
      } as any,
    });
  }
}

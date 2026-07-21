import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { WalletService } from '../../wallet/services/wallet.service';

type OrderItemInput = {
  productId: string;
  quantity: number;
  storeId?: string;
};

export class CreateOrderCommand {
  constructor(
    public readonly orderData: {
      userId: string;
      storeId: string;
      serviceFee: number;
      deliveryFee: number;
      subTotal: number;
      totalPrice: number;
      vendorAddress: string;
      customerAddress: string;
    },
    public readonly orderItems: OrderItemInput[],
    public readonly paymentMethod?: 'wallet' | 'paystack',
  ) {}
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async execute(command: CreateOrderCommand) {
    const { orderData, orderItems, paymentMethod } = command;
    const { userId, storeId, totalPrice } = orderData;

    if (!userId || !storeId) {
      throw new BadRequestException('userId and storeId are required');
    }

    const items = await Promise.all(
      orderItems.map(async (item) => {
        const product = await this.prisma.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { name: true, price: true },
        });
        return {
          storeId: item.storeId ?? storeId,
          productId: item.productId,
          quantity: item.quantity,
          productName: product.name,
          unitPrice: product.price,
        };
      }),
    );

    const orderCreateData = {
      userId: orderData.userId,
      storeId: orderData.storeId,
      serviceFee: orderData.serviceFee,
      deliveryFee: orderData.deliveryFee,
      subTotal: orderData.subTotal,
      totalPrice: orderData.totalPrice,
      vendorAddress: orderData.vendorAddress,
      customerAddress: orderData.customerAddress,
      orderItems: { create: items },
    };

    if (paymentMethod === 'wallet') {
      await this.walletService.ensureWallet(userId);

      return this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: orderCreateData,
          include: { orderItems: true },
        });

        const paid = await this.walletService.payOrderFromWallet({
          userId,
          storeId,
          orderId: order.id,
          totalPrice,
          tx,
        });

        return {
          ...order,
          payment: paid.payment,
          walletTransaction: paid.transaction,
          walletBalance: paid.wallet.balance,
        };
      });
    }

    return this.prisma.order.create({
      data: orderCreateData,
      include: { orderItems: true },
    });
  }
}

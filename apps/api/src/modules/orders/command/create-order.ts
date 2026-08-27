import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { FulfillmentType, OrderStatus, Prisma } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { WalletService } from '../../wallet/services/wallet.service';
import { OrderStatusService } from '../services/order-status.service';
import { FeeEngineService } from '../services/fee-engine.service';

type OrderItemInput = {
  productId: string;
  quantity: number;
  storeId?: string;
};

export class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly storeId: string,
    public readonly fulfillmentType: FulfillmentType,
    public readonly vendorAddress: string,
    public readonly customerAddress: string,
    public readonly orderItems: OrderItemInput[],
    public readonly paymentMethod?: 'wallet' | 'paystack',
    /** Client hints — recomputed server-side; ignored if products resolve */
    public readonly clientFees?: {
      serviceFee?: number;
      deliveryFee?: number;
      subTotal?: number;
      totalPrice?: number;
    },
  ) {}
}

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly orderStatusService: OrderStatusService,
    private readonly feeEngine: FeeEngineService,
  ) {}

  async execute(command: CreateOrderCommand) {
    const {
      userId,
      storeId,
      fulfillmentType,
      vendorAddress,
      customerAddress,
      orderItems,
      paymentMethod,
    } = command;

    if (!userId || !storeId) {
      throw new BadRequestException('userId and storeId are required');
    }
    if (!orderItems?.length) {
      throw new BadRequestException('orderItems are required');
    }

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.isActive) {
      throw new BadRequestException('Store not found or inactive');
    }

    const items = await Promise.all(
      orderItems.map(async (item) => {
        const product = await this.prisma.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { name: true, price: true, storeId: true, isAvailable: true },
        });
        if (product.storeId !== storeId) {
          throw new BadRequestException('Product does not belong to this store');
        }
        if (!product.isAvailable) {
          throw new BadRequestException(`Product ${product.name} is unavailable`);
        }
        return {
          storeId,
          productId: item.productId,
          quantity: item.quantity,
          productName: product.name,
          unitPrice: product.price,
          lineTotal: product.price.mul(item.quantity),
        };
      }),
    );

    const subTotal = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const settlement = this.feeEngine.compute({
      subTotal,
      fulfillmentType,
      store,
    });

    if (
      fulfillmentType === FulfillmentType.delivery &&
      !customerAddress?.trim()
    ) {
      throw new BadRequestException('customerAddress is required for delivery');
    }

    const orderCreateData = {
      userId,
      storeId,
      fulfillmentType,
      serviceFee: settlement.serviceFee,
      deliveryFee: settlement.deliveryFee,
      bagFee: settlement.bagFee,
      surgeFee: settlement.surgeFee,
      subTotal: settlement.subTotal,
      totalPrice: settlement.totalPrice,
      vendorCommission: settlement.vendorCommission,
      vendorPayout: settlement.vendorPayout,
      platformServiceFee: settlement.platformServiceFee,
      platformDeliveryFee: settlement.platformDeliveryFee,
      vendorAddress: vendorAddress || store.address,
      customerAddress:
        fulfillmentType === FulfillmentType.pickup
          ? customerAddress || store.address
          : customerAddress,
      status: OrderStatus.pending,
      orderItems: {
        create: items.map(({ productId, quantity, productName, unitPrice, storeId: sid }) => ({
          storeId: sid,
          productId,
          quantity,
          productName,
          unitPrice,
        })),
      },
      charges: {
        create: settlement.charges.map((c) => ({
          type: c.type,
          amount: c.amount,
          beneficiary: c.beneficiary,
          commissionable: c.commissionable,
        })),
      },
      statusEvents: {
        create: {
          status: OrderStatus.pending,
          actorId: userId,
          note: 'Order placed',
        },
      },
    };

    if (paymentMethod === 'wallet') {
      await this.walletService.ensureWallet(userId);

      return this.prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: orderCreateData,
          include: { orderItems: true, statusEvents: true, charges: true },
        });

        const paid = await this.walletService.payOrderFromWallet({
          userId,
          storeId,
          orderId: order.id,
          totalPrice: settlement.totalPrice,
          tx,
        });

        await this.orderStatusService.markPaidIfPending(order.id, {
          actorId: userId,
          note: 'Paid from wallet',
          tx,
        });

        const refreshed = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include: {
            orderItems: true,
            statusEvents: true,
            payments: true,
            charges: true,
          },
        });

        return {
          ...refreshed,
          payment: paid.payment,
          walletTransaction: paid.transaction,
          walletBalance: paid.wallet.balance,
        };
      });
    }

    return this.prisma.order.create({
      data: orderCreateData,
      include: { orderItems: true, statusEvents: true, charges: true },
    });
  }
}

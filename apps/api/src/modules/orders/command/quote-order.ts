import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { FulfillmentType } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { FeeEngineService } from '../services/fee-engine.service';

type QuoteItem = { productId: string; quantity: number };

export class QuoteOrderCommand {
  constructor(
    public readonly storeId: string,
    public readonly fulfillmentType: FulfillmentType,
    public readonly orderItems: QuoteItem[],
  ) {}
}

@CommandHandler(QuoteOrderCommand)
export class QuoteOrderHandler implements ICommandHandler<QuoteOrderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feeEngine: FeeEngineService,
  ) {}

  async execute(command: QuoteOrderCommand) {
    if (!command.orderItems?.length) {
      throw new BadRequestException('orderItems are required');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: command.storeId },
    });
    if (!store || !store.isActive) {
      throw new BadRequestException('Store not found or inactive');
    }

    let subTotal = 0;
    const lines = [];
    for (const item of command.orderItems) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          price: true,
          storeId: true,
          isAvailable: true,
        },
      });
      if (!product || product.storeId !== command.storeId) {
        throw new BadRequestException(`Invalid product ${item.productId}`);
      }
      if (!product.isAvailable) {
        throw new BadRequestException(`${product.name} is unavailable`);
      }
      const lineTotal = Number(product.price) * item.quantity;
      subTotal += lineTotal;
      lines.push({
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.price),
        quantity: item.quantity,
        lineTotal,
      });
    }

    const quote = this.feeEngine.compute({
      subTotal,
      fulfillmentType: command.fulfillmentType,
      store,
    });

    return {
      storeId: store.id,
      fulfillmentType: command.fulfillmentType,
      items: lines,
      subTotal: Number(quote.subTotal),
      serviceFee: Number(quote.serviceFee),
      deliveryFee: Number(quote.deliveryFee),
      bagFee: Number(quote.bagFee),
      surgeFee: Number(quote.surgeFee),
      totalPrice: Number(quote.totalPrice),
      charges: quote.charges.map((c) => ({
        type: c.type,
        amount: Number(c.amount),
        beneficiary: c.beneficiary,
        commissionable: c.commissionable,
      })),
    };
  }
}

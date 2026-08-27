import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentStatus } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaystackService } from '@shared/provider/payment/paystack.service';

export class InitializePaymentCommand {
  constructor(
    public readonly actor: { id: string; role: string },
    public readonly orderId: string,
    public readonly email: string,
    public readonly callbackUrl?: string,
  ) {}
}

@CommandHandler(InitializePaymentCommand)
export class InitializePaymentHandler
  implements ICommandHandler<InitializePaymentCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  async execute(command: InitializePaymentCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: command.orderId },
      include: {
        store: true,
        payments: { where: { status: PaymentStatus.success }, take: 1 },
        user: { select: { id: true, email: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (
      command.actor.role !== 'ADMIN' &&
      order.userId !== command.actor.id
    ) {
      throw new ForbiddenException('Not your order');
    }
    if (order.payments.length > 0) {
      throw new BadRequestException('Order is already paid');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Cannot initialise payment for order in status ${order.status}`,
      );
    }

    const amountKobo = Math.round(Number(order.totalPrice) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo < 100) {
      throw new BadRequestException('Invalid order amount');
    }

    const email = command.email || order.user.email;
    // Charge full amount to platform; vendor/rider paid later via settlement ledger.
    const paymentData: Record<string, unknown> = {
      email,
      amount: amountKobo,
      currency: 'NGN',
      metadata: {
        orderId: order.id,
        storeId: order.storeId,
        userId: order.userId,
        purpose: 'order_payment',
      },
    };
    if (command.callbackUrl) {
      paymentData.callback_url = command.callbackUrl;
    }

    const paystackResponse =
      await this.paystackService.initializeTransaction(paymentData);
    const { reference, access_code, authorization_url } = paystackResponse;

    const amountNaira = amountKobo / 100;

    const createdPayment = await this.prisma.payment.create({
      data: {
        amount: amountNaira,
        userId: order.userId,
        storeId: order.storeId,
        orderId: order.id,
        reference,
        currency: 'NGN',
        paymentMethod: 'paystack',
        paystackTransaction: {
          create: {
            reference,
            amount: amountKobo,
            currency: 'NGN',
            accessCode: access_code,
            orderId: order.id,
            metadata: paymentData.metadata as object,
          },
        },
      },
      include: { paystackTransaction: true },
    });

    return {
      payment: createdPayment,
      authorization_url,
      access_code,
      reference,
      orderId: order.id,
    };
  }
}

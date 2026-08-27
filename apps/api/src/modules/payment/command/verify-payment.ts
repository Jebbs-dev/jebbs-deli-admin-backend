import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PaystackService } from '@shared/provider/payment/paystack.service';
import {
  PaystackChargeData,
  SettlePaymentService,
} from '../services/settle-payment.service';
import { PrismaService } from '@shared/system/database/prisma.service';
import { OrderAccessService } from '../../orders/services/order-access.service';
import type { Actor } from '@shared/features/auth/access.service';

export class VerifyPaymentCommand {
  constructor(
    public readonly actor: Actor,
    public readonly reference: string,
  ) {}
}

@CommandHandler(VerifyPaymentCommand)
export class VerifyPaymentHandler
  implements ICommandHandler<VerifyPaymentCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly settlePaymentService: SettlePaymentService,
    private readonly orderAccess: OrderAccessService,
  ) {}

  async execute(command: VerifyPaymentCommand) {
    const { reference, actor } = command;
    const existing = await this.prisma.paystackTransaction.findUnique({
      where: { reference },
      select: { payment: { select: { orderId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Transaction not found for reference ${reference}`);
    }
    await this.orderAccess.getOrderForActor(existing.payment.orderId, actor);

    const paystackResponse =
      await this.paystackService.verifyTransaction(reference);

    if (!paystackResponse?.data) {
      throw new NotFoundException('Transaction not found on Paystack');
    }

    const data = paystackResponse.data as PaystackChargeData;

    const result = await this.settlePaymentService.settleFromPaystackData(
      reference,
      data,
    );

    return {
      success: !!result.settled,
      settled: !!result.settled,
      status: result.payment.status,
      orderId: result.payment.orderId,
      reference,
      ...result.payment,
    };
  }
}

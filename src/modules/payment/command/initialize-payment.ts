import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';

export class InitializePaymentCommand {
  constructor(
    public readonly paymentData: Record<string, unknown>,
    public readonly userId: string,
    public readonly storeId: string,
    public readonly orderId: string,
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
    const { paymentData, userId, storeId, orderId } = command;
    const paystackResponse =
      await this.paystackService.initializeTransaction(paymentData);
    const { reference, access_code, authorization_url } = paystackResponse;

    const amountKobo = Number(paymentData.amount);
    const amountNaira = amountKobo / 100;

    const createdPayment = await this.prisma.payment.create({
      data: {
        amount: amountNaira,
        userId,
        storeId,
        orderId,
        reference,
        currency: (paymentData.currency as string) || 'NGN',
        paystackTransaction: {
          create: {
            reference,
            amount: Number.isFinite(amountKobo) ? Math.round(amountKobo) : 0,
            currency: (paymentData.currency as string) || 'NGN',
            accessCode: access_code,
          },
        },
      },
      include: { paystackTransaction: true },
    });

    return { payment: createdPayment, authorization_url, access_code };
  }
}

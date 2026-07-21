import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';
import {
  PaystackChargeData,
  SettlePaymentService,
} from '../services/settle-payment.service';

export class VerifyPaymentCommand {
  constructor(public readonly reference: string) {}
}

@CommandHandler(VerifyPaymentCommand)
export class VerifyPaymentHandler
  implements ICommandHandler<VerifyPaymentCommand>
{
  constructor(
    private readonly paystackService: PaystackService,
    private readonly settlePaymentService: SettlePaymentService,
  ) {}

  async execute(command: VerifyPaymentCommand) {
    const { reference } = command;
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

    if (!result.settled) {
      return {
        success: false,
        message: 'Transaction not yet paid',
        data: result,
      };
    }

    return {
      success: true,
      ...result.payment,
    };
  }
}

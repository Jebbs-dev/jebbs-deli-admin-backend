import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';
import {
  PaystackChargeData,
  SettlePaymentService,
} from '../services/settle-payment.service';

export class AdminVerifyPaymentCommand {
  constructor(public readonly reference: string) {}
}

@CommandHandler(AdminVerifyPaymentCommand)
export class AdminVerifyPaymentHandler
  implements ICommandHandler<AdminVerifyPaymentCommand>
{
  constructor(
    private readonly paystackService: PaystackService,
    private readonly settlePaymentService: SettlePaymentService,
  ) {}

  async execute(command: AdminVerifyPaymentCommand) {
    const paystackResponse = await this.paystackService.verifyTransaction(
      command.reference,
    );

    if (!paystackResponse?.data) {
      throw new NotFoundException('Transaction not found on Paystack');
    }

    const data = paystackResponse.data as PaystackChargeData;
    const result = await this.settlePaymentService.settleFromPaystackData(
      command.reference,
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
      paystack: paystackResponse,
      ...result,
    };
  }
}

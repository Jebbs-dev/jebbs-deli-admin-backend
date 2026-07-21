import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';
import {
  PaystackChargeData,
} from '../../payment/services/settle-payment.service';
import { WalletService } from '../services/wallet.service';

export class VerifyTopupCommand {
  constructor(
    public readonly userId: string,
    public readonly reference: string,
  ) {}
}

@CommandHandler(VerifyTopupCommand)
export class VerifyTopupHandler implements ICommandHandler<VerifyTopupCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
  ) {}

  async execute(command: VerifyTopupCommand) {
    const { userId, reference } = command;

    if (!reference.startsWith('wlt_')) {
      throw new BadRequestException('Invalid wallet top-up reference');
    }

    const ledger = await this.prisma.walletTransaction.findUnique({
      where: { reference },
      include: { wallet: true },
    });

    if (!ledger || ledger.wallet.userId !== userId) {
      throw new ForbiddenException('Top-up not found for this user');
    }

    const paystackResponse =
      await this.paystackService.verifyTransaction(reference);
    const data = paystackResponse?.data as PaystackChargeData | undefined;
    if (!data) {
      throw new BadRequestException('Transaction not found on Paystack');
    }

    const result = await this.walletService.creditFromPaystackTopup(
      reference,
      data,
    );

    return {
      success: result.settled,
      ...result,
    };
  }
}

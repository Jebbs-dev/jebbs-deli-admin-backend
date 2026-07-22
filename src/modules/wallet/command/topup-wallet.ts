import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/prisma/client';
import { PaymentStatus, WalletTxType } from '@generated/prisma/enums';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';
import { WalletService } from '../services/wallet.service';

export class TopupWalletCommand {
  constructor(
    public readonly userId: string,
    public readonly amountNaira: number,
    public readonly callbackUrl?: string,
  ) {}
}

@CommandHandler(TopupWalletCommand)
export class TopupWalletHandler implements ICommandHandler<TopupWalletCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
  ) {}

  async execute(command: TopupWalletCommand) {
    const { userId, amountNaira, callbackUrl } = command;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletService.ensureWallet(userId);
    const reference = `wlt_${randomUUID().replaceAll('-', '')}`;
    const amountKobo = Math.round(amountNaira * 100);
    const creditAmount = new Prisma.Decimal(amountNaira);

    const ledger = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTxType.topup,
        amount: creditAmount,
        balanceAfter: wallet.balance,
        status: PaymentStatus.pending,
        reference,
        description: `Wallet top-up of ${amountNaira} NGN`,
        metadata: {
          purpose: 'wallet_topup',
          userId,
        },
      },
    });

    try {
      const paystackResponse = await this.paystackService.initializeTransaction({
        email: user.email,
        amount: amountKobo,
        reference,
        currency: wallet.currency,
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
        metadata: {
          purpose: 'wallet_topup',
          userId,
          walletTransactionId: ledger.id,
          walletId: wallet.id,
        },
      });

      const updatedLedger = await this.prisma.walletTransaction.update({
        where: { id: ledger.id },
        data: {
          metadata: {
            purpose: 'wallet_topup',
            userId,
            walletTransactionId: ledger.id,
            walletId: wallet.id,
            accessCode: paystackResponse.access_code,
          },
        },
      });

      return {
        reference,
        amount: amountNaira,
        currency: wallet.currency,
        authorization_url: paystackResponse.authorization_url,
        access_code: paystackResponse.access_code,
        transaction: updatedLedger,
      };
    } catch (err) {
      const message =
        err instanceof HttpException
          ? (typeof err.getResponse() === 'string'
              ? err.getResponse()
              : ((err.getResponse() as { message?: string | string[] })
                  .message ?? err.message))
          : err instanceof Error
            ? err.message
            : 'Failed to initialize top-up';
      const failureReason = Array.isArray(message)
        ? message.join(', ')
        : String(message);

      await this.prisma.walletTransaction.update({
        where: { id: ledger.id },
        data: {
          status: PaymentStatus.failed,
          metadata: {
            purpose: 'wallet_topup',
            userId,
            failureReason,
          },
        },
      });

      if (err instanceof HttpException) {
        throw err;
      }
      throw new BadRequestException(failureReason);
    }
  }
}

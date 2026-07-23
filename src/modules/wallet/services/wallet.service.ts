import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@generated/prisma/client';
import { PaymentStatus, WalletTxType } from '@generated/prisma/enums';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { EmailService } from '@libs/shared/provider/email/email.service';
import { PaystackChargeData } from '../../payment/services/settle-payment.service';
import { randomUUID } from 'node:crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async ensureWallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.wallet.create({
      data: { userId },
    });
  }

  async getWalletForUser(userId: string) {
    const wallet = await this.ensureWallet(userId);
    const recent = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { ...wallet, recentTransactions: recent };
  }

  /**
   * Credit wallet after successful Paystack top-up. Idempotent.
   */
  async creditFromPaystackTopup(reference: string, data: PaystackChargeData) {
    if (!reference.startsWith('wlt_')) {
      throw new BadRequestException('Invalid wallet top-up reference');
    }

    const paidAt = data.paid_at ? new Date(data.paid_at) : null;
    // Paystack may omit paid_at briefly; status=success is authoritative.
    const isSuccess = data.status === 'success';
    if (!isSuccess) {
      return { settled: false, message: 'Transaction not yet paid' };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.walletTransaction.findUnique({
        where: { reference },
        include: { wallet: true },
      });

      if (!ledger) {
        throw new NotFoundException(
          `Wallet top-up not found for reference ${reference}`,
        );
      }

      if (ledger.status === PaymentStatus.success) {
        this.logger.debug(`Top-up already credited: ${reference}`);
        return {
          settled: true,
          newlyCredited: false,
          wallet: ledger.wallet,
          transaction: ledger,
        };
      }

      if (ledger.type !== WalletTxType.topup) {
        throw new BadRequestException('Reference is not a wallet top-up');
      }

      const creditAmount = ledger.amount;
      if (creditAmount.lte(0)) {
        throw new BadRequestException('Invalid top-up amount');
      }

      // Optional amount check vs Paystack kobo
      if (typeof data.amount === 'number') {
        const expectedKobo = creditAmount.mul(100).round().toNumber();
        if (data.amount !== expectedKobo) {
          this.logger.warn(
            `Top-up amount mismatch ref=${reference} expected=${expectedKobo} got=${data.amount}`,
          );
          throw new BadRequestException('Top-up amount mismatch');
        }
      }

      // Claim the pending/processing row so concurrent webhook+verify cannot double-credit.
      const claimed = await tx.walletTransaction.updateMany({
        where: {
          id: ledger.id,
          status: {
            in: [PaymentStatus.pending, PaymentStatus.processing],
          },
        },
        data: { status: PaymentStatus.processing },
      });

      if (claimed.count === 0) {
        const current = await tx.walletTransaction.findUnique({
          where: { reference },
          include: { wallet: true },
        });
        if (current?.status === PaymentStatus.success) {
          return {
            settled: true,
            newlyCredited: false,
            wallet: current.wallet,
            transaction: current,
          };
        }
        throw new BadRequestException('Top-up could not be settled');
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: ledger.walletId },
        data: { balance: { increment: creditAmount } },
      });

      const updatedTx = await tx.walletTransaction.update({
        where: { id: ledger.id },
        data: {
          status: PaymentStatus.success,
          balanceAfter: updatedWallet.balance,
          metadata: {
            ...((ledger.metadata as object) ?? {}),
            paystackId: data.id ?? null,
            channel: data.channel ?? null,
            paidAt: data.paid_at ?? paidAt?.toISOString() ?? null,
            gatewayResponse: data.gateway_response ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Wallet credited ${creditAmount.toString()} for ${reference}`,
      );

      return {
        settled: true,
        newlyCredited: true,
        wallet: updatedWallet,
        transaction: updatedTx,
      };
    });

    if (result.settled && result.newlyCredited) {
      void this.notifyTopupEmail(reference, result.wallet).catch(
        (err: unknown) => {
          this.logger.warn(
            `Wallet top-up email failed for ${reference}: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      );
    }

    return result;
  }

  private async notifyTopupEmail(
    reference: string,
    wallet: {
      id: string;
      userId: string;
      balance: Prisma.Decimal;
      currency: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: wallet.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) {
      return;
    }

    const tx = await this.prisma.walletTransaction.findUnique({
      where: { reference },
      select: { amount: true },
    });
    if (!tx) {
      return;
    }

    await this.emailService.sendWalletTopupEmail({
      to: user.email,
      name: user.name ?? 'there',
      amount: tx.amount.toString(),
      currency: wallet.currency,
      balance: wallet.balance.toString(),
      reference,
    });
  }

  /**
   * Debit wallet and create order payment inside an existing or new transaction.
   */
  async payOrderFromWallet(params: {
    userId: string;
    storeId: string;
    orderId: string;
    totalPrice: Prisma.Decimal | number | string;
    tx?: Prisma.TransactionClient;
  }) {
    const run = async (client: Prisma.TransactionClient) => {
      const wallet = await client.wallet.findUnique({
        where: { userId: params.userId },
      });
      if (!wallet) {
        throw new BadRequestException('Wallet not found. Top up first.');
      }

      const total = new Prisma.Decimal(params.totalPrice);
      if (wallet.balance.lt(total)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const reference = `ordpay_${randomUUID().replaceAll('-', '')}`;
      const updatedWallet = await client.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: total } },
      });

      const payment = await client.payment.create({
        data: {
          userId: params.userId,
          storeId: params.storeId,
          orderId: params.orderId,
          amount: total,
          reference,
          status: PaymentStatus.success,
          paymentMethod: 'wallet',
          paidAt: new Date(),
          currency: wallet.currency,
          description: 'Paid from wallet',
        },
      });

      const ledger = await client.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.order_payment,
          amount: total.negated(),
          balanceAfter: updatedWallet.balance,
          status: PaymentStatus.success,
          reference,
          orderId: params.orderId,
          paymentId: payment.id,
          description: `Order ${params.orderId}`,
        },
      });

      return { wallet: updatedWallet, payment, transaction: ledger };
    };

    if (params.tx) {
      return run(params.tx);
    }
    return this.prisma.$transaction(run);
  }
}

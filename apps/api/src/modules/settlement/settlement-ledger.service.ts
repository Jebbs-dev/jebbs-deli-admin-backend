import { Injectable, Logger } from '@nestjs/common';
import {
  FulfillmentType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  SettlementLedgerStatus,
  SettlementLedgerTxType,
} from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { FeeEngineService } from '../orders/services/fee-engine.service';

@Injectable()
export class SettlementLedgerService {
  private readonly logger = new Logger(SettlementLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feeEngine: FeeEngineService,
  ) {}

  /**
   * When an order becomes delivered (and is paid), credit vendor (+ rider for delivery).
   * Idempotent via unique ledger references.
   */
  async settleOrderOnDelivered(
    orderId: string,
    options?: { tx?: Prisma.TransactionClient; actorId?: string },
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const order = await client.order.findUnique({
        where: { id: orderId },
        include: {
          assignment: true,
          payments: {
            where: { status: PaymentStatus.success },
            take: 1,
          },
        },
      });

      if (!order) {
        this.logger.warn(`settleOrderOnDelivered: order ${orderId} missing`);
        return { settled: false, reason: 'missing' as const };
      }

      if (order.status !== OrderStatus.delivered) {
        return { settled: false, reason: 'not_delivered' as const };
      }

      if (order.payments.length === 0 && !order.paidAt) {
        this.logger.warn(
          `Order ${orderId} delivered but unpaid — skipping settlement`,
        );
        return { settled: false, reason: 'unpaid' as const };
      }

      if (order.settledAt) {
        return { settled: true, reason: 'already' as const };
      }

      const paymentId = order.payments[0]?.id ?? null;

      await this.creditStore(client, {
        storeId: order.storeId,
        orderId: order.id,
        paymentId,
        amount: order.vendorPayout,
      });

      if (
        order.fulfillmentType === FulfillmentType.delivery &&
        order.assignment &&
        order.assignment.status === 'delivered'
      ) {
        const riderAmount = this.feeEngine.riderShareOfDelivery(
          order.platformDeliveryFee,
        );
        if (riderAmount.gt(0)) {
          await this.creditRider(client, {
            userId: order.assignment.riderId,
            orderId: order.id,
            assignmentId: order.assignment.id,
            amount: riderAmount,
          });
        }
      }

      await client.order.update({
        where: { id: order.id },
        data: { settledAt: new Date() },
      });

      return { settled: true, reason: 'ok' as const };
    };

    if (options?.tx) {
      return run(options.tx);
    }
    return this.prisma.$transaction(run);
  }

  private async ensureStoreWallet(
    client: Prisma.TransactionClient,
    storeId: string,
  ) {
    const existing = await client.storeWallet.findUnique({ where: { storeId } });
    if (existing) return existing;
    return client.storeWallet.create({ data: { storeId } });
  }

  private async ensureRiderWallet(
    client: Prisma.TransactionClient,
    userId: string,
  ) {
    const existing = await client.riderWallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return client.riderWallet.create({ data: { userId } });
  }

  private async creditStore(
    client: Prisma.TransactionClient,
    params: {
      storeId: string;
      orderId: string;
      paymentId: string | null;
      amount: Prisma.Decimal;
    },
  ) {
    if (params.amount.lte(0)) return null;

    const reference = `store_ord_${params.orderId}`;
    const existing = await client.storeLedgerTx.findUnique({
      where: { reference },
    });
    if (existing) return existing;

    const wallet = await this.ensureStoreWallet(client, params.storeId);
    const updated = await client.storeWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: params.amount } },
    });

    return client.storeLedgerTx.create({
      data: {
        storeId: params.storeId,
        walletId: wallet.id,
        type: SettlementLedgerTxType.order_credit,
        amount: params.amount,
        balanceAfter: updated.balance,
        status: SettlementLedgerStatus.available,
        reference,
        orderId: params.orderId,
        paymentId: params.paymentId ?? undefined,
        description: `Vendor payout for order ${params.orderId}`,
      },
    });
  }

  private async creditRider(
    client: Prisma.TransactionClient,
    params: {
      userId: string;
      orderId: string;
      assignmentId: string;
      amount: Prisma.Decimal;
    },
  ) {
    if (params.amount.lte(0)) return null;

    const reference = `rider_ord_${params.orderId}`;
    const existing = await client.riderLedgerTx.findUnique({
      where: { reference },
    });
    if (existing) return existing;

    const wallet = await this.ensureRiderWallet(client, params.userId);
    const updated = await client.riderWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: params.amount } },
    });

    return client.riderLedgerTx.create({
      data: {
        userId: params.userId,
        walletId: wallet.id,
        type: SettlementLedgerTxType.delivery_credit,
        amount: params.amount,
        balanceAfter: updated.balance,
        status: SettlementLedgerStatus.available,
        reference,
        orderId: params.orderId,
        assignmentId: params.assignmentId,
        description: `Delivery earnings for order ${params.orderId}`,
      },
    });
  }

  async getStoreWallet(storeId: string) {
    const wallet = await this.ensureStoreWallet(this.prisma, storeId);
    const transactions = await this.prisma.storeLedgerTx.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...wallet, transactions };
  }

  async getRiderWallet(userId: string) {
    const wallet = await this.ensureRiderWallet(this.prisma, userId);
    const transactions = await this.prisma.riderLedgerTx.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...wallet, transactions };
  }
}

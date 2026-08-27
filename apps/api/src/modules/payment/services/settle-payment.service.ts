import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { OrderStatus, PaymentStatus } from '@generated/prisma/client';
import { EmailService } from '@shared/provider/email/email.service';
import { nairaToKobo } from '@shared/system/common/money';
import { OrderStatusService } from '../../orders/services/order-status.service';

export type PaystackChargeData = {
  id?: number | string;
  reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  gateway_response?: string;
  message?: string;
  paid_at?: string | null;
  created_at?: string;
  receipt_number?: string | null;
  requested_amount?: number;
  pos_transaction_data?: unknown;
  customer?: unknown;
  authorization?: unknown;
  fees?: number;
  log?: unknown;
  domain?: string;
  ip_address?: string;
};

@Injectable()
export class SettlePaymentService {
  private readonly logger = new Logger(SettlePaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  /**
   * Persist Paystack charge data and mark Payment + Order paid when successful.
   * Idempotent across webhook/verify races.
   */
  async settleFromPaystackData(
    reference: string,
    data: PaystackChargeData,
    options?: { webhookSignature?: string; webhookVerified?: boolean },
  ) {
    const existing = await this.prisma.paystackTransaction.findUnique({
      where: { reference },
      include: {
        payment: {
          include: {
            user: { select: { email: true, name: true } },
            order: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Transaction not found for reference ${reference}`);
    }

    const paidAt = data.paid_at ? new Date(data.paid_at) : null;
    const isSuccess = data.status === 'success';
    const paymentStatus: PaymentStatus = isSuccess
      ? PaymentStatus.success
      : this.mapPaystackStatus(data.status);

    const paystackId =
      data.id !== undefined && data.id !== null ? BigInt(data.id) : undefined;

    const wasAlreadySuccess = existing.payment.status === PaymentStatus.success;

    if (isSuccess && typeof data.amount === 'number') {
      const expectedKobo = nairaToKobo(existing.payment.amount.toString());
      if (data.amount !== expectedKobo) {
        this.logger.warn(
          `Settle amount mismatch ref=${reference} expected=${expectedKobo} got=${data.amount}`,
        );
        throw new BadRequestException('Payment amount mismatch');
      }
    }

    if (isSuccess && wasAlreadySuccess) {
      return {
        payment: this.serializePayment(existing.payment),
        transaction: this.serializeTx(existing),
        settled: true,
        alreadySettled: true,
      };
    }

    // Claim non-success payment row so concurrent settle calls don't double-apply.
    if (isSuccess) {
      const claimed = await this.prisma.payment.updateMany({
        where: {
          id: existing.paymentId,
          status: { not: PaymentStatus.success },
        },
        data: {
          status: PaymentStatus.processing,
        },
      });
      if (claimed.count === 0) {
        const current = await this.prisma.payment.findUnique({
          where: { id: existing.paymentId },
          include: {
            user: { select: { email: true, name: true } },
            order: true,
          },
        });
        return {
          payment: this.serializePayment(current!),
          transaction: this.serializeTx(existing),
          settled: true,
          alreadySettled: true,
        };
      }

      // Ensure no other successful payment exists for this order
      const otherSuccess = await this.prisma.payment.findFirst({
        where: {
          orderId: existing.payment.orderId,
          status: PaymentStatus.success,
          id: { not: existing.paymentId },
        },
      });
      if (otherSuccess) {
        await this.prisma.payment.update({
          where: { id: existing.paymentId },
          data: {
            status: PaymentStatus.abandoned,
            description: 'Superseded by existing successful payment',
          },
        });
        return {
          payment: this.serializePayment(otherSuccess),
          transaction: this.serializeTx(existing),
          settled: true,
          alreadySettled: true,
        };
      }
    }

    const updatedTransaction = await this.prisma.paystackTransaction.update({
      where: { reference },
      data: {
        ...(paystackId !== undefined ? { paystackId } : {}),
        receiptNumber: data.receipt_number ?? undefined,
        requestedAmount: data.requested_amount ?? undefined,
        gatewayResponse: data.gateway_response ?? undefined,
        posTransactionData: data.pos_transaction_data as object | undefined,
        paidAt: paidAt ?? (isSuccess ? new Date() : undefined),
        customer: data.customer as object | undefined,
        authorization: data.authorization as object | undefined,
        fees: data.fees ?? undefined,
        log: data.log as object | undefined,
        channel: data.channel ?? undefined,
        status: paymentStatus,
        domain: data.domain ?? undefined,
        createdAt: data.created_at ? new Date(data.created_at) : undefined,
        currency: data.currency ?? undefined,
        ipAddress: data.ip_address ?? undefined,
        ...(typeof data.amount === 'number' ? { amount: data.amount } : {}),
        ...(options?.webhookVerified
          ? {
              webhookVerified: true,
              webhookSignature: options.webhookSignature,
              webhookReceivedAt: new Date(),
            }
          : {}),
      },
    });

    const updatedPayment = await this.prisma.payment.update({
      where: { id: existing.paymentId },
      data: {
        ...(paystackId !== undefined ? { paystackId } : {}),
        paidAt: paidAt ?? (isSuccess ? new Date() : undefined),
        status: paymentStatus,
        paymentMethod: data.channel ?? existing.payment.paymentMethod ?? 'paystack',
        description: data.message ?? data.gateway_response ?? undefined,
      },
      include: {
        user: { select: { email: true, name: true } },
        order: true,
      },
    });

    if (isSuccess) {
      await this.orderStatusService.markPaidIfPending(updatedPayment.orderId, {
        note: `Paystack ${reference}`,
      });

      if (!wasAlreadySuccess) {
        this.logger.log(`Payment settled for reference ${reference}`);
        void this.emailService
          .sendOrderPaidEmail({
            to: updatedPayment.user.email,
            name: updatedPayment.user.name ?? 'there',
            orderId: updatedPayment.orderId,
            amount: updatedPayment.amount.toString(),
            currency: updatedPayment.currency,
            reference,
          })
          .catch((err: unknown) => {
            this.logger.warn(
              `Order paid email failed for ${reference}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }
    }

    return {
      payment: this.serializePayment(updatedPayment),
      transaction: this.serializeTx(updatedTransaction),
      settled: isSuccess,
    };
  }

  private mapPaystackStatus(status?: string): PaymentStatus {
    switch (status) {
      case 'success':
        return PaymentStatus.success;
      case 'failed':
        return PaymentStatus.failed;
      case 'abandoned':
        return PaymentStatus.abandoned;
      case 'reversed':
        return PaymentStatus.reversed;
      case 'ongoing':
        return PaymentStatus.ongoing;
      case 'queued':
        return PaymentStatus.queued;
      case 'processing':
        return PaymentStatus.processing;
      default:
        return PaymentStatus.pending;
    }
  }

  private serializePayment(payment: Record<string, unknown> & {
    paystackId?: bigint | number | null;
    status?: string;
    orderId?: string;
  }) {
    return {
      ...payment,
      paystackId:
        payment.paystackId !== null && payment.paystackId !== undefined
          ? Number(payment.paystackId)
          : null,
    };
  }

  private serializeTx(tx: Record<string, unknown> & {
    paystackId?: bigint | number | null;
  }) {
    return {
      ...tx,
      paystackId:
        tx.paystackId !== null && tx.paystackId !== undefined
          ? Number(tx.paystackId)
          : null,
    };
  }
}

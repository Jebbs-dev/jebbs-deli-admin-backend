import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaymentStatus } from '@generated/prisma/enums';
import { EmailService } from '@libs/shared/provider/email/email.service';

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
  ) {}

  /**
   * Persist Paystack charge data and mark Payment as success when paid.
   * Idempotent when payment is already success.
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
    const isSuccess = data.status === 'success' && !!paidAt;
    const paymentStatus: PaymentStatus = isSuccess
      ? PaymentStatus.success
      : this.mapPaystackStatus(data.status);

    const paystackId =
      data.id !== undefined && data.id !== null ? BigInt(data.id) : undefined;

    const updatedTransaction = await this.prisma.paystackTransaction.update({
      where: { reference },
      data: {
        ...(paystackId !== undefined ? { paystackId } : {}),
        receiptNumber: data.receipt_number ?? undefined,
        requestedAmount: data.requested_amount ?? undefined,
        gatewayResponse: data.gateway_response ?? undefined,
        posTransactionData: data.pos_transaction_data as object | undefined,
        paidAt: paidAt ?? undefined,
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

    const wasAlreadySuccess = existing.payment.status === PaymentStatus.success;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: existing.paymentId },
      data: {
        ...(paystackId !== undefined ? { paystackId } : {}),
        paidAt: paidAt ?? undefined,
        status: paymentStatus,
        paymentMethod: data.channel ?? undefined,
        description: data.message ?? data.gateway_response ?? undefined,
      },
      include: {
        user: { select: { email: true, name: true } },
        order: true,
      },
    });

    if (isSuccess && !wasAlreadySuccess) {
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

    return {
      payment: {
        ...updatedPayment,
        paystackId:
          updatedPayment.paystackId !== null
            ? Number(updatedPayment.paystackId)
            : null,
      },
      transaction: {
        ...updatedTransaction,
        paystackId:
          updatedTransaction.paystackId !== null
            ? Number(updatedTransaction.paystackId)
            : null,
      },
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
}

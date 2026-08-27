import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import {
  PaystackChargeData,
  SettlePaymentService,
} from '../payment/services/settle-payment.service';
import { WalletService } from '../wallet/services/wallet.service';
import { PayoutSchedulerService } from '../settlement/payout-scheduler.service';

type PaystackWebhookPayload = {
  readonly event: string;
  readonly data: PaystackChargeData & {
    metadata?: { purpose?: string } | string | null;
  } & Record<string, unknown>;
};

@Injectable()
export class PaystackWebhookService {
  private readonly logger = new Logger(PaystackWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlePaymentService: SettlePaymentService,
    private readonly walletService: WalletService,
    private readonly payoutScheduler: PayoutSchedulerService,
  ) {}

  private eventId(payload: PaystackWebhookPayload): string {
    const raw = payload.data?.id;
    if (raw !== undefined && raw !== null) {
      return `${payload.event}_${String(raw)}`;
    }
    const ref = payload.data?.reference;
    if (typeof ref === 'string') {
      return `${payload.event}_${ref}`;
    }
    return `${payload.event}_${JSON.stringify(payload.data).slice(0, 180)}`;
  }

  private isWalletTopup(data: PaystackWebhookPayload['data']): boolean {
    const reference = data.reference;
    if (typeof reference === 'string' && reference.startsWith('wlt_')) {
      return true;
    }
    const meta = data.metadata;
    if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
      return meta.purpose === 'wallet_topup';
    }
    if (typeof meta === 'string') {
      try {
        const parsed = JSON.parse(meta) as { purpose?: string };
        return parsed.purpose === 'wallet_topup';
      } catch {
        return false;
      }
    }
    return false;
  }

  async processEvent(
    payload: PaystackWebhookPayload,
    signature?: string,
  ): Promise<void> {
    const paystackEventId = this.eventId(payload);
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { paystackEventId },
    });
    if (existing) {
      this.logger.debug(`Duplicate webhook ignored: ${paystackEventId}`);
      return;
    }

    // Reserve the event id first so concurrent deliveries are ignored, but
    // delete the reservation if processing fails so Paystack can retry.
    try {
      await this.prisma.webhookEvent.create({
        data: {
          paystackEventId,
          event: payload.event,
          payload: payload as object,
        },
      });
    } catch (err: unknown) {
      // Unique violation = another worker already claimed this event.
      this.logger.debug(
        `Webhook claim race ignored: ${paystackEventId} (${err instanceof Error ? err.message : String(err)})`,
      );
      return;
    }

    try {
      switch (payload.event) {
        case 'charge.success':
          await this.onChargeSuccess(payload.data, signature);
          break;
        case 'charge.failed':
          await this.onChargeFailed(payload.data, signature);
          break;
        case 'transfer.success':
          await this.onTransferSuccess(payload.data);
          break;
        case 'transfer.failed':
        case 'transfer.reversed':
          await this.onTransferFailed(payload.data);
          break;
        default:
          this.logger.debug(`Unhandled Paystack event: ${payload.event}`);
      }
    } catch (err: unknown) {
      this.logger.error(
        `Paystack webhook handler error: ${err instanceof Error ? err.message : String(err)}`,
      );
      await this.prisma.webhookEvent
        .delete({ where: { paystackEventId } })
        .catch((deleteErr: unknown) => {
          this.logger.warn(
            `Failed to release webhook claim ${paystackEventId}: ${deleteErr instanceof Error ? deleteErr.message : String(deleteErr)}`,
          );
        });
      throw err;
    }
  }

  private async onChargeSuccess(
    data: PaystackWebhookPayload['data'],
    signature?: string,
  ): Promise<void> {
    const reference = data.reference;
    if (typeof reference !== 'string') {
      this.logger.warn('charge.success without reference');
      return;
    }

    if (this.isWalletTopup(data)) {
      await this.walletService.creditFromPaystackTopup(reference, data);
      return;
    }

    await this.settlePaymentService.settleFromPaystackData(reference, data, {
      webhookVerified: true,
      webhookSignature: signature,
    });
  }

  private async onChargeFailed(
    data: PaystackWebhookPayload['data'],
    signature?: string,
  ): Promise<void> {
    const reference = data.reference;
    if (typeof reference !== 'string') {
      this.logger.warn('charge.failed without reference');
      return;
    }
    if (this.isWalletTopup(data)) {
      this.logger.debug(`Ignoring failed wallet topup webhook: ${reference}`);
      return;
    }
    await this.settlePaymentService.settleFromPaystackData(
      reference,
      { ...data, status: data.status || 'failed' },
      {
        webhookVerified: true,
        webhookSignature: signature,
      },
    );
  }

  private transferReference(data: PaystackWebhookPayload['data']): string | null {
    if (typeof data.reference === 'string' && data.reference.length > 0) {
      return data.reference;
    }
    return null;
  }

  private async onTransferSuccess(
    data: PaystackWebhookPayload['data'],
  ): Promise<void> {
    const reference = this.transferReference(data);
    if (!reference) {
      this.logger.warn('transfer.success without reference');
      return;
    }
    const transferCode =
      typeof data.transfer_code === 'string' ? data.transfer_code : undefined;
    await this.payoutScheduler.completeTransferByReference(
      reference,
      transferCode,
    );
  }

  private async onTransferFailed(
    data: PaystackWebhookPayload['data'],
  ): Promise<void> {
    const reference = this.transferReference(data);
    if (!reference) {
      this.logger.warn('transfer.failed without reference');
      return;
    }
    const reason =
      (typeof data.gateway_response === 'string' && data.gateway_response) ||
      (typeof data.message === 'string' && data.message) ||
      (typeof data.status === 'string' && data.status) ||
      'transfer_failed';
    await this.payoutScheduler.failTransferByReference(reference, reason);
  }
}

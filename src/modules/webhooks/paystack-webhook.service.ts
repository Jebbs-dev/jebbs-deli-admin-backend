import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import {
  PaystackChargeData,
  SettlePaymentService,
} from '../payment/services/settle-payment.service';
import { WalletService } from '../wallet/services/wallet.service';

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
}

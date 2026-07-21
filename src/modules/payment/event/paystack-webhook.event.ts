import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@libs/shared/system/config/config.service';

export class PaystackWebhookEvent {
  constructor(
    public readonly body: any,
    public readonly signature: string,
  ) {}
}

@EventsHandler(PaystackWebhookEvent)
@Injectable()
export class PaystackWebhookHandler implements IEventHandler<PaystackWebhookEvent> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PaystackWebhookEvent) {
    const { body, signature } = event;

    const hash = crypto
      .createHmac('sha512', this.configService.paystackSecretKey)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      return { status: 'unauthorized', message: 'Invalid signature' };
    }

    const { event: eventType, data } = body;

    if (eventType === 'charge.success') {
      const reference = data.reference;

      const existingTransaction = await this.prisma.paystackTransaction.findUnique({
        where: { reference },
      });

      if (!existingTransaction) {
        return { status: 'not_found', message: 'Transaction not found' };
      }

      await this.prisma.paystackTransaction.update({
        where: { reference },
        data: {
          paystackId: BigInt(data.id),
          receiptNumber: data.receipt_number,
          requestedAmount: data.requested_amount,
          gatewayResponse: data.gateway_response,
          posTransactionData: data.pos_transaction_data,
          paidAt: data.paid_at,
          customer: data.customer,
          authorization: data.authorization,
          fees: data.fees,
          log: data.log,
          channel: data.channel,
          status: data.status,
          domain: data.domain,
          createdAt: data.created_at,
          currency: data.currency,
          ipAddress: data.ip_address,
          webhookVerified: true,
          webhookSignature: signature,
          webhookReceivedAt: new Date(),
        },
      });

      await this.prisma.payment.update({
        where: { id: existingTransaction.paymentId },
        data: {
          paidAt: new Date(data.paid_at),
          paymentMethod: data.channel,
          description: data.message,
          paystackId: BigInt(data.id),
        },
      });

      return { status: 'success' };
    }

    return { received: true };
  }
}

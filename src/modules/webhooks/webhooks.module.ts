import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaystackWebhookService } from './paystack-webhook.service';
import { PaymentModule } from '../payment/payment.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PaymentModule, WalletModule],
  controllers: [WebhooksController],
  providers: [PaystackWebhookService],
})
export class WebhooksModule {}

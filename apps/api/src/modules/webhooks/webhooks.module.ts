import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PaystackWebhookService } from './paystack-webhook.service';
import { PaystackIpGuard } from './paystack-ip.guard';
import { PaymentModule } from '../payment/payment.module';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [PaymentModule, WalletModule, SettlementModule],
  controllers: [WebhooksController],
  providers: [PaystackWebhookService, PaystackIpGuard],
})
export class WebhooksModule {}

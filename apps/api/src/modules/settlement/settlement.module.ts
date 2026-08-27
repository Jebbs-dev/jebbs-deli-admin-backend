import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentClientModule } from '@shared/provider/payment/payment-client.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '@shared/features/auth/auth.module';
import { SettlementLedgerService } from './settlement-ledger.service';
import { PayoutSchedulerService } from './payout-scheduler.service';
import { SettlementController } from './settlement.controller';
import { UpsertRiderPayoutHandler } from './command/upsert-rider-payout';

@Module({
  imports: [
    CqrsModule,
    PaymentClientModule,
    AuthModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [SettlementController],
  providers: [
    SettlementLedgerService,
    PayoutSchedulerService,
    UpsertRiderPayoutHandler,
  ],
  exports: [SettlementLedgerService, PayoutSchedulerService],
})
export class SettlementModule {}

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PaymentController } from './payment.controller';
import { InitializePaymentHandler } from './command/initialize-payment';
import { VerifyPaymentHandler } from './command/verify-payment';
import { AdminVerifyPaymentHandler } from './command/admin-verify-payment';
import { GetPaymentByIdHandler } from './query/get-payment-by-id';
import { GetPaymentsHandler } from './query/get-payments';
import { GetPaymentsByUserHandler } from './query/get-payments-by-user';
import { GetPaymentsByStoreHandler } from './query/get-payments-by-store';
import { GetPaymentsByOrderHandler } from './query/get-payments-by-order';
import { SettlePaymentService } from './services/settle-payment.service';
import { EmailModule } from '@libs/shared/provider/email/email.module';

const CommandHandlers = [
  InitializePaymentHandler,
  VerifyPaymentHandler,
  AdminVerifyPaymentHandler,
];
const QueryHandlers = [
  GetPaymentByIdHandler,
  GetPaymentsHandler,
  GetPaymentsByUserHandler,
  GetPaymentsByStoreHandler,
  GetPaymentsByOrderHandler,
];

@Module({
  imports: [CqrsModule, EmailModule],
  controllers: [PaymentController],
  providers: [...CommandHandlers, ...QueryHandlers, SettlePaymentService],
  exports: [SettlePaymentService],
})
export class PaymentModule {}

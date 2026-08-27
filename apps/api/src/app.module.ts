import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { DatabaseModule } from '@shared/system/database/database.module';
import { ConfigModule } from '@shared/system/config/config.module';
import { AuthModule as SharedAuthModule } from '@shared/features/auth/auth.module';
import { LoggerModule } from '@shared/system/logger/logger.module';
import { HttpLoggerMiddleware } from '@shared/system/logger/http-logger.middleware';
import { PaymentClientModule } from '@shared/provider/payment/payment-client.module';
import { UploadModule } from '@shared/provider/upload/upload.module';
import { EmailModule } from '@shared/provider/email/email.module';

import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WalletModule } from './modules/wallet/wallet.module';

import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettlementModule } from './modules/settlement/settlement.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    ConfigModule,
    DatabaseModule,
    SharedAuthModule,
    LoggerModule,
    EmailModule,
    PaymentClientModule,
    UploadModule,
    AuthModule,
    UsersModule,
    StoresModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    WalletModule,
    WebhooksModule,
    DeliveriesModule,
    AnalyticsModule,
    SettlementModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}

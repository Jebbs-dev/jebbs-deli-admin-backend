import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '@libs/shared/system/database/database.module';
import { ConfigModule } from '@libs/shared/system/config/config.module';
import { AuthModule as SharedAuthModule } from '@libs/shared/features/auth/auth.module';
import { LoggerModule } from '@libs/shared/system/logger/logger.module';
import { HttpLoggerMiddleware } from '@libs/shared/system/logger/http-logger.middleware';
import { PaymentClientModule } from '@libs/shared/provider/payment/payment-client.module';
import { UploadModule } from '@libs/shared/provider/upload/upload.module';
import { EmailModule } from '@libs/shared/provider/email/email.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}

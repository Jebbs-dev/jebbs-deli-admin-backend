import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { WalletController } from './wallet.controller';
import { WalletService } from './services/wallet.service';
import { TopupWalletHandler } from './command/topup-wallet';
import { VerifyTopupHandler } from './command/verify-topup';
import { GetWalletHandler } from './query/get-wallet';
import { GetWalletTransactionsHandler } from './query/get-wallet-transactions';

const CommandHandlers = [TopupWalletHandler, VerifyTopupHandler];
const QueryHandlers = [GetWalletHandler, GetWalletTransactionsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [WalletController],
  providers: [WalletService, ...CommandHandlers, ...QueryHandlers],
  exports: [WalletService],
})
export class WalletModule {}

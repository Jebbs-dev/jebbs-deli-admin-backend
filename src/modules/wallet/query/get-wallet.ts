import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { WalletService } from '../services/wallet.service';

export class GetWalletQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetWalletQuery)
export class GetWalletHandler implements IQueryHandler<GetWalletQuery> {
  constructor(private readonly walletService: WalletService) {}

  async execute(query: GetWalletQuery) {
    return this.walletService.getWalletForUser(query.userId);
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { WalletService } from '../services/wallet.service';

export class GetWalletTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly filters: {
      offset?: number;
      limit?: number;
    },
  ) {}
}

@QueryHandler(GetWalletTransactionsQuery)
export class GetWalletTransactionsHandler
  implements IQueryHandler<GetWalletTransactionsQuery>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async execute(query: GetWalletTransactionsQuery) {
    const wallet = await this.walletService.ensureWallet(query.userId);
    const offset = query.filters.offset ?? 0;
    const limit = query.filters.limit ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      next: offset + limit < total ? offset + limit : null,
      previous: offset > 0 ? Math.max(0, offset - limit) : null,
    };
  }
}

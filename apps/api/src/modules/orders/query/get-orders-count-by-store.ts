import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentStatus } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';

export class GetOrdersCountByStoreQuery {
  constructor(public readonly storeId: string) {}
}

@QueryHandler(GetOrdersCountByStoreQuery)
export class GetOrdersCountByStoreHandler
  implements IQueryHandler<GetOrdersCountByStoreQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersCountByStoreQuery) {
    const where = {
      storeId: query.storeId,
      payments: { some: { status: PaymentStatus.success } },
    };
    const totalOrders = await this.prisma.order.count({ where });
    return { orders: [], totalOrders };
  }
}

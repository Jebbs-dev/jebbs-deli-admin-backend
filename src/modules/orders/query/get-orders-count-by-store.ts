import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetOrdersCountByStoreQuery {
  constructor(public readonly storeId: string) {}
}

@QueryHandler(GetOrdersCountByStoreQuery)
export class GetOrdersCountByStoreHandler implements IQueryHandler<GetOrdersCountByStoreQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersCountByStoreQuery) {
    const [orders, totalOrders] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { storeId: query.storeId, payment: { status: 'success' } },
        orderBy: { createdAt: 'desc' },
        include: { orderItems: { include: { product: true, store: true } } },
      }),
      this.prisma.order.count({}),
    ]);
    return { orders, totalOrders };
  }
}

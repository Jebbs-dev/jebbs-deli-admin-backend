import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetOrdersCountQuery {}

@QueryHandler(GetOrdersCountQuery)
export class GetOrdersCountHandler implements IQueryHandler<GetOrdersCountQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [orders, totalOrders] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { orderItems: { include: { product: true, store: true } } },
      }),
      this.prisma.order.count({}),
    ]);
    return { orders, totalOrders };
  }
}

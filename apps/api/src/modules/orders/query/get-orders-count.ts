import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';

export class GetOrdersCountQuery {}

@QueryHandler(GetOrdersCountQuery)
export class GetOrdersCountHandler implements IQueryHandler<GetOrdersCountQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const totalOrders = await this.prisma.order.count({});
    return { orders: [], totalOrders };
  }
}

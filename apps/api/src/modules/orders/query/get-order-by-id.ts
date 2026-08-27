import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { orderDetailInclude } from '../services/order-status.service';

export class GetOrderByIdQuery {
  constructor(public readonly orderId: string) {}
}

@QueryHandler(GetOrderByIdQuery)
export class GetOrderByIdHandler implements IQueryHandler<GetOrderByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrderByIdQuery) {
    return this.prisma.order.findUnique({
      where: { id: query.orderId },
      include: orderDetailInclude,
    });
  }
}

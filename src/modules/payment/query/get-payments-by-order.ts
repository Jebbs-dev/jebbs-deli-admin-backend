import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetPaymentsByOrderQuery {
  constructor(public readonly orderId: string) {}
}

@QueryHandler(GetPaymentsByOrderQuery)
export class GetPaymentsByOrderHandler implements IQueryHandler<GetPaymentsByOrderQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPaymentsByOrderQuery) {
    return this.prisma.payment.findMany({ where: { orderId: query.orderId } });
  }
}

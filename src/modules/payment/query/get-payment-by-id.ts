import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetPaymentByIdQuery {
  constructor(public readonly paymentId: string) {}
}

@QueryHandler(GetPaymentByIdQuery)
export class GetPaymentByIdHandler implements IQueryHandler<GetPaymentByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPaymentByIdQuery) {
    return this.prisma.payment.findUnique({
      where: { id: query.paymentId },
      include: { paystackTransaction: true },
    });
  }
}

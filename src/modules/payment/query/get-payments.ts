import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetPaymentsQuery {}

@QueryHandler(GetPaymentsQuery)
export class GetPaymentsHandler implements IQueryHandler<GetPaymentsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const payments = await this.prisma.payment.findMany({});
    return payments.map((p) => ({ ...p, paystackId: Number(p.paystackId) }));
  }
}

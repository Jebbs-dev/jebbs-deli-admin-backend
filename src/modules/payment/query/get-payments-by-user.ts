import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaginatedResult } from '@libs/shared/system/common/interfaces/paginated-result.interface';

export class GetPaymentsByUserQuery {
  constructor(
    public readonly userId: string,
    public readonly filters?: any,
  ) {}
}

@QueryHandler(GetPaymentsByUserQuery)
export class GetPaymentsByUserHandler implements IQueryHandler<GetPaymentsByUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPaymentsByUserQuery): Promise<PaginatedResult<any>> {
    const { userId, filters } = query;
    const { offset, limit, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = filters || {};
    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const where: any = { userId };
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { [sortBy]: order },
        include: { paystackTransaction: true },
        skip: offsetNumber,
        take: limitNumber,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, limit: limitNumber, offset: offsetNumber, next: offsetNumber + limitNumber < total, previous: offsetNumber > 0 };
  }
}

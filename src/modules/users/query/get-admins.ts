import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaginatedResult } from '@libs/shared/system/common/interfaces/paginated-result.interface';

export class GetAdminsQuery {
  constructor(public readonly filters?: any) {}
}

@QueryHandler(GetAdminsQuery)
export class GetAdminsHandler implements IQueryHandler<GetAdminsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAdminsQuery): Promise<PaginatedResult<any>> {
    const { search, offset, limit, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = query.filters || {};
    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const where: any = { role: 'ADMIN' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order },
        include: { store: true },
        skip: offsetNumber,
        take: limitNumber,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, limit: limitNumber, offset: offsetNumber, next: offsetNumber + limitNumber < total, previous: offsetNumber > 0 };
  }
}

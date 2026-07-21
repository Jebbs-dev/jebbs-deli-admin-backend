import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaginatedResult } from '@libs/shared/system/common/interfaces/paginated-result.interface';

export class GetVendorAdminsQuery {
  constructor(public readonly filters?: any) {}
}

@QueryHandler(GetVendorAdminsQuery)
export class GetVendorAdminsHandler implements IQueryHandler<GetVendorAdminsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVendorAdminsQuery): Promise<PaginatedResult<any>> {
    const { search, offset, limit, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = query.filters || {};
    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const where: any = { role: 'VENDOR' };
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

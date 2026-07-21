import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaginatedResult } from '@libs/shared/system/common/interfaces/paginated-result.interface';

const orderStatuses = ['pending', 'delivered', 'cancelled'];

function getOrderEnum(searchTerm: string): string | null {
  const matched = orderStatuses.find((c) => c.toLowerCase() === searchTerm);
  return matched ?? null;
}

export class GetOrdersByStoreQuery {
  constructor(
    public readonly storeId: string,
    public readonly filters?: any,
  ) {}
}

@QueryHandler(GetOrdersByStoreQuery)
export class GetOrdersByStoreHandler implements IQueryHandler<GetOrdersByStoreQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersByStoreQuery): Promise<PaginatedResult<any>> {
    const { storeId, filters } = query;
    const { search, offset, limit, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = filters || {};
    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const where: any = { storeId };
    if (search) {
      const findStatus = getOrderEnum(search.toLowerCase());
      where.OR = [...(findStatus ? [{ status: findStatus }] : [])];
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: order },
        include: {
          user: true,
          orderItems: { include: { product: true, store: true } },
        },
        skip: offsetNumber,
        take: limitNumber,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, limit: limitNumber, offset: offsetNumber, next: offsetNumber + limitNumber < total, previous: offsetNumber > 0 };
  }
}

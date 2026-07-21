import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { PaginatedResult } from '@libs/shared/system/common/interfaces/paginated-result.interface';

const allCategories = ['meal', 'drink', 'snack', 'dessert', 'sides', 'small_chops', 'chicken', 'pizza', 'burger'];

function getCategoryEnum(searchTerm: string): string | null {
  const matched = allCategories.find((c) => c.toLowerCase() === searchTerm);
  return matched ?? null;
}

export class GetFilteredProductsByStoreQuery {
  constructor(
    public readonly storeId: string,
    public readonly filters?: any,
  ) {}
}

@QueryHandler(GetFilteredProductsByStoreQuery)
export class GetFilteredProductsByStoreHandler implements IQueryHandler<GetFilteredProductsByStoreQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetFilteredProductsByStoreQuery): Promise<PaginatedResult<any>> {
    const { storeId, filters } = query;
    const { search, offset, limit, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = filters || {};
    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const where: any = { storeId };
    if (search) {
      const findCategory = getCategoryEnum(search.toLowerCase());
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        ...(findCategory ? [{ category: findCategory }] : []),
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
      this.prisma.product.findMany({
        where,
        orderBy: { [sortBy]: order },
        include: { store: true },
        skip: offsetNumber,
        take: limitNumber,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, limit: limitNumber, offset: offsetNumber, next: offsetNumber + limitNumber < total, previous: offsetNumber > 0 };
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaginatedResult } from '@shared/system/common/interfaces/paginated-result.interface';
import { storePublicOmit } from '@shared/system/common/safe-selects';
import {
  storeListQuerySchema,
  type StoreListQuery,
} from '@shared/system/common/dto/list-query.dto';
import {
  pageLimits,
  parseSort,
  storeListWhere,
  toPage,
} from '@shared/system/common/list-query';

export class GetStoresQuery {
  constructor(
    public readonly filters?: unknown,
    public readonly includeInactive = false,
  ) {}
}

@QueryHandler(GetStoresQuery)
export class GetStoresHandler implements IQueryHandler<GetStoresQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStoresQuery): Promise<PaginatedResult<unknown>> {
    const filters = storeListQuerySchema.parse(
      query.filters ?? {},
    ) as StoreListQuery;
    const { limit, offset } = pageLimits(filters);
    const { field, dir } = parseSort(filters.sort, ['createdAt', 'name'], {
      field: 'createdAt',
      dir: 'desc',
    });
    const where = storeListWhere(filters, {
      includeInactive: query.includeInactive,
    });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        orderBy: { [field]: dir },
        omit: storePublicOmit,
        ...(query.includeInactive
          ? {}
          : {
              include: {
                products: {
                  where: { isAvailable: true },
                  select: { id: true, category: true },
                },
              },
            }),
        skip: offset,
        take: limit,
      }),
      this.prisma.store.count({ where }),
    ]);

    return toPage(items, total, limit, offset);
  }
}

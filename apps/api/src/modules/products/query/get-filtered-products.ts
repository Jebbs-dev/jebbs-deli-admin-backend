import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaginatedResult } from '@shared/system/common/interfaces/paginated-result.interface';
import {
  productListQuerySchema,
  type ProductListQuery,
} from '@shared/system/common/dto/list-query.dto';
import {
  pageLimits,
  parseSort,
  productListWhere,
  toPage,
} from '@shared/system/common/list-query';
import { productWithPublicStoreInclude } from '@shared/system/common/safe-selects';

export class GetFilteredProductsQuery {
  constructor(
    public readonly filters?: unknown,
    public readonly catalogOnly = true,
  ) {}
}

@QueryHandler(GetFilteredProductsQuery)
export class GetFilteredProductsHandler
  implements IQueryHandler<GetFilteredProductsQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetFilteredProductsQuery,
  ): Promise<PaginatedResult<unknown>> {
    const filters = productListQuerySchema.parse(
      query.filters ?? {},
    ) as ProductListQuery;
    const { limit, offset } = pageLimits(filters);
    const { field, dir } = parseSort(filters.sort, ['createdAt', 'name', 'price'], {
      field: 'createdAt',
      dir: 'desc',
    });
    const where = productListWhere(filters, {
      storeId: filters.storeId,
      catalogOnly: query.catalogOnly,
    });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { [field]: dir },
        include: productWithPublicStoreInclude,
        skip: offset,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return toPage(items, total, limit, offset);
  }
}

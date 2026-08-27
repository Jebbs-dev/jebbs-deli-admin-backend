import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

export class GetFilteredProductsByStoreQuery {
  constructor(
    public readonly storeId: string,
    public readonly filters?: unknown,
    public readonly catalogOnly = true,
  ) {}
}

@QueryHandler(GetFilteredProductsByStoreQuery)
export class GetFilteredProductsByStoreHandler
  implements IQueryHandler<GetFilteredProductsByStoreQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetFilteredProductsByStoreQuery,
  ): Promise<PaginatedResult<unknown>> {
    const store = await this.prisma.store.findUnique({
      where: { id: query.storeId },
      select: { id: true, isActive: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    if (query.catalogOnly && !store.isActive) {
      throw new NotFoundException('Store not found');
    }

    const filters = productListQuerySchema.parse(
      query.filters ?? {},
    ) as ProductListQuery;
    if (filters.storeId && filters.storeId !== query.storeId) {
      throw new BadRequestException('storeId does not match the path');
    }

    const { limit, offset } = pageLimits(filters);
    const { field, dir } = parseSort(filters.sort, ['createdAt', 'name', 'price'], {
      field: 'createdAt',
      dir: 'desc',
    });
    const where = productListWhere(filters, {
      storeId: query.storeId,
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

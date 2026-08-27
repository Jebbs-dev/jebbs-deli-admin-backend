import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaginatedResult } from '@shared/system/common/interfaces/paginated-result.interface';
import { orderDetailInclude } from '../services/order-status.service';
import {
  orderListQuerySchema,
  type OrderListQuery,
} from '@shared/system/common/dto/list-query.dto';
import {
  pageLimits,
  parseSort,
  orderListWhere,
  toPage,
} from '@shared/system/common/list-query';

export class GetOrdersQuery {
  constructor(public readonly filters?: unknown) {}
}

@QueryHandler(GetOrdersQuery)
export class GetOrdersHandler implements IQueryHandler<GetOrdersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersQuery): Promise<PaginatedResult<unknown>> {
    const filters = orderListQuerySchema.parse(
      query.filters ?? {},
    ) as OrderListQuery;
    const { limit, offset } = pageLimits(filters);
    const { field, dir } = parseSort(
      filters.sort,
      ['createdAt', 'totalPrice', 'status'],
      { field: 'createdAt', dir: 'desc' },
    );
    const where = orderListWhere(filters, { storeId: filters.storeId, userId: filters.userId });

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { [field]: dir },
        include: orderDetailInclude,
        skip: offset,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return toPage(items, total, limit, offset);
  }
}

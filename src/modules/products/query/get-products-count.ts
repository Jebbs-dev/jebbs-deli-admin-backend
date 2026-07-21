import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetProductsCountQuery {
  constructor(public readonly storeId: string) {}
}

@QueryHandler(GetProductsCountQuery)
export class GetProductsCountHandler implements IQueryHandler<GetProductsCountQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductsCountQuery) {
    const totalProducts = await this.prisma.product.count({ where: { storeId: query.storeId } });
    return { totalProducts };
  }
}

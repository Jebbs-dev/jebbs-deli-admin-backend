import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetProductsByStoreQuery {
  constructor(public readonly storeId: string) {}
}

@QueryHandler(GetProductsByStoreQuery)
export class GetProductsByStoreHandler implements IQueryHandler<GetProductsByStoreQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductsByStoreQuery) {
    return this.prisma.product.findMany({
      where: { storeId: query.storeId },
      include: { store: true },
    });
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetProductByStoreQuery {
  constructor(
    public readonly productId: string,
    public readonly storeId: string,
  ) {}
}

@QueryHandler(GetProductByStoreQuery)
export class GetProductByStoreHandler implements IQueryHandler<GetProductByStoreQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByStoreQuery) {
    return this.prisma.product.findUnique({
      where: { id: query.productId, storeId: query.storeId },
      include: { store: true },
    });
  }
}

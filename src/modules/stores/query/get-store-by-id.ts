import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetStoreByIdQuery {
  constructor(public readonly storeId: string) {}
}

@QueryHandler(GetStoreByIdQuery)
export class GetStoreByIdHandler implements IQueryHandler<GetStoreByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStoreByIdQuery) {
    return this.prisma.store.findUnique({
      where: { id: query.storeId },
      include: { products: true },
    });
  }
}

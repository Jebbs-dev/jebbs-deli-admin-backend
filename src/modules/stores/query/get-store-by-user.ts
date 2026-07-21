import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetStoreByUserQuery {
  constructor(
    public readonly storeId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(GetStoreByUserQuery)
export class GetStoreByUserHandler implements IQueryHandler<GetStoreByUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStoreByUserQuery) {
    return this.prisma.store.findUnique({
      where: { id: query.storeId, userId: query.userId },
      include: { products: true, admin: true },
    });
  }
}

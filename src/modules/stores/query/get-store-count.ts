import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetStoreCountQuery {}

@QueryHandler(GetStoreCountQuery)
export class GetStoreCountHandler implements IQueryHandler<GetStoreCountQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const totalStores = await this.prisma.store.count({});
    return { totalStores };
  }
}

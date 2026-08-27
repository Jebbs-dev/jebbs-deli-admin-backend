import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { storePublicOmit } from '@shared/system/common/safe-selects';

export class GetStoreByIdQuery {
  constructor(
    public readonly storeId: string,
    public readonly includePayoutFields = false,
    public readonly publicOnly = false,
  ) {}
}

@QueryHandler(GetStoreByIdQuery)
export class GetStoreByIdHandler implements IQueryHandler<GetStoreByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStoreByIdQuery) {
    const store = await this.prisma.store.findUnique({
      where: { id: query.storeId },
      ...(query.includePayoutFields ? {} : { omit: storePublicOmit }),
    });
    if (!store) throw new NotFoundException('Store not found');
    if (query.publicOnly && !store.isActive) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }
}

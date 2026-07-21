import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetVendorAdminByIdQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetVendorAdminByIdQuery)
export class GetVendorAdminByIdHandler implements IQueryHandler<GetVendorAdminByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVendorAdminByIdQuery) {
    return this.prisma.user.findUnique({
      where: { id: query.userId },
      include: { store: { include: { products: true } } },
    });
  }
}

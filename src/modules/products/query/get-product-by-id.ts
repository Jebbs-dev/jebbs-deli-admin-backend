import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetProductByIdQuery {
  constructor(public readonly productId: string) {}
}

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByIdQuery) {
    return this.prisma.product.findUnique({
      where: { id: query.productId },
      include: { store: true },
    });
  }
}

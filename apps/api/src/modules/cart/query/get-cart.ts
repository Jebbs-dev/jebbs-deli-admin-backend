import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { cartWithItemsInclude } from '../cart.helpers';

export class GetCartQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCartQuery)
export class GetCartHandler implements IQueryHandler<GetCartQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCartQuery) {
    return this.prisma.cart.findUnique({
      where: { userId: query.userId },
      include: cartWithItemsInclude,
    });
  }
}

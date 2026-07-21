import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetCartQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetCartQuery)
export class GetCartHandler implements IQueryHandler<GetCartQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCartQuery) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: query.userId },
      include: {
        cartGroups: {
          include: {
            store: true,
            cartItems: { include: { product: true } },
          },
        },
        user: true,
      },
    });

    return cart;
  }
}

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { productWithPublicStoreInclude } from '@shared/system/common/safe-selects';

export class GetProductByStoreQuery {
  constructor(
    public readonly productId: string,
    public readonly storeId: string,
  ) {}
}

@QueryHandler(GetProductByStoreQuery)
export class GetProductByStoreHandler
  implements IQueryHandler<GetProductByStoreQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByStoreQuery) {
    const product = await this.prisma.product.findFirst({
      where: { id: query.productId, storeId: query.storeId },
      include: productWithPublicStoreInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}

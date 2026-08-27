import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { productWithPublicStoreInclude } from '@shared/system/common/safe-selects';

export class GetProductByIdQuery {
  constructor(
    public readonly productId: string,
    public readonly publicOnly = true,
  ) {}
}

@QueryHandler(GetProductByIdQuery)
export class GetProductByIdHandler implements IQueryHandler<GetProductByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProductByIdQuery) {
    const product = await this.prisma.product.findUnique({
      where: { id: query.productId },
      include: productWithPublicStoreInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    if (query.publicOnly && !product.store.isActive) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';

export type Actor = { id: string; role: string };

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  assertSelfOrAdmin(targetUserId: string, actor: Actor) {
    if (actor.role === 'ADMIN') return;
    if (actor.id === targetUserId) return;
    throw new ForbiddenException('Not allowed to access this user');
  }

  async canAccessStore(storeId: string, actor?: Actor | null) {
    if (!actor) return false;
    if (actor.role === 'ADMIN') return true;
    if (actor.role === 'VENDOR') {
      const store = await this.prisma.store.findFirst({
        where: { id: storeId, userId: actor.id },
        select: { id: true },
      });
      return Boolean(store);
    }
    return false;
  }

  async assertStoreAccess(storeId: string, actor: Actor) {
    if (await this.canAccessStore(storeId, actor)) return;
    throw new ForbiddenException('Not allowed to access this store');
  }

  async assertProductStoreAccess(productId: string, actor: Actor) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { storeId: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    await this.assertStoreAccess(product.storeId, actor);
    return product.storeId;
  }
}

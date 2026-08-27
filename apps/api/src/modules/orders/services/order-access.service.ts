import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { orderDetailInclude } from '../services/order-status.service';

@Injectable()
export class OrderAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderForActor(
    orderId: string,
    actor: { id: string; role: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');

    if (actor.role === 'ADMIN') return order;
    if (actor.role === 'USER' && order.userId === actor.id) return order;
    if (actor.role === 'VENDOR') {
      const store = await this.prisma.store.findFirst({
        where: { id: order.storeId, userId: actor.id },
      });
      if (store) return order;
    }
    if (actor.role === 'RIDER' && order.assignment?.riderId === actor.id) {
      // Rider payload: strip payment internals
      const { payments, ...rest } = order;
      return {
        ...rest,
        payments: undefined,
        paymentSummary: payments?.[0]
          ? { status: payments[0].status, paidAt: payments[0].paidAt }
          : null,
      };
    }

    throw new ForbiddenException('Not allowed to view this order');
  }

  async assertUserOwnsOrders(userId: string, actor: { id: string; role: string }) {
    if (actor.role === 'ADMIN') return;
    if (actor.id === userId) return;
    throw new ForbiddenException('Not allowed to list these orders');
  }

  async assertStoreAccess(
    storeId: string,
    actor: { id: string; role: string },
  ) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'VENDOR') {
      const store = await this.prisma.store.findFirst({
        where: { id: storeId, userId: actor.id },
      });
      if (store) return;
    }
    throw new ForbiddenException('Not allowed to access this store');
  }
}

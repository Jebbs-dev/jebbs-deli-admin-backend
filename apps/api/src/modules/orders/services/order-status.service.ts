import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FulfillmentType,
  OrderStatus,
  Prisma,
} from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { riderPayoutOmit, storePublicOmit } from '@shared/system/common/safe-selects';

const VENDOR_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.paid]: [OrderStatus.confirmed, OrderStatus.cancelled],
  [OrderStatus.confirmed]: [OrderStatus.preparing, OrderStatus.cancelled],
  [OrderStatus.preparing]: [OrderStatus.ready, OrderStatus.cancelled],
  [OrderStatus.ready]: [OrderStatus.cancelled],
};

@Injectable()
export class OrderStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async recordStatus(
    orderId: string,
    status: OrderStatus,
    options?: {
      actorId?: string;
      note?: string;
      paidAt?: Date | null;
      tx?: Prisma.TransactionClient;
    },
  ) {
    const client = options?.tx ?? this.prisma;
    const data: Prisma.OrderUpdateInput = {
      status,
      statusEvents: {
        create: {
          status,
          actorId: options?.actorId,
          note: options?.note,
        },
      },
    };
    if (status === OrderStatus.paid) {
      data.paidAt = options?.paidAt ?? new Date();
    }
    return client.order.update({
      where: { id: orderId },
      data,
    });
  }

  async markPaidIfPending(
    orderId: string,
    options?: { actorId?: string; note?: string; tx?: Prisma.TransactionClient },
  ) {
    const client = options?.tx ?? this.prisma;
    const claimed = await client.order.updateMany({
      where: { id: orderId, status: OrderStatus.pending },
      data: { status: OrderStatus.paid, paidAt: new Date() },
    });
    if (claimed.count === 0) {
      return { updated: false };
    }
    await client.orderStatusEvent.create({
      data: {
        orderId,
        status: OrderStatus.paid,
        actorId: options?.actorId,
        note: options?.note ?? 'Payment confirmed',
      },
    });
    return { updated: true };
  }

  async transitionVendor(
    orderId: string,
    next: OrderStatus,
    actor: { id: string; role: string; storeId?: string | null },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertVendorOrAdmin(actor, order.store.userId, order.storeId);

    const allowed = VENDOR_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${next}`,
      );
    }

    return this.recordStatus(orderId, next, { actorId: actor.id });
  }

  async completePickup(
    orderId: string,
    actor: { id: string; role: string; storeId?: string | null },
    options?: { tx?: Prisma.TransactionClient },
  ) {
    const client = options?.tx ?? this.prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertVendorOrAdmin(actor, order.store.userId, order.storeId);

    if (order.fulfillmentType !== FulfillmentType.pickup) {
      throw new BadRequestException('Only pickup orders can be completed this way');
    }
    if (order.status !== OrderStatus.ready) {
      throw new BadRequestException('Order must be ready before pickup completion');
    }

    return this.recordStatus(orderId, OrderStatus.delivered, {
      actorId: actor.id,
      note: 'Customer picked up',
      tx: client,
    });
  }

  async cancelOrder(
    orderId: string,
    actor: { id: string; role: string; storeId?: string | null },
    note?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { userId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertVendorOrAdmin(actor, order.store.userId, order.storeId);

    const cancellable: OrderStatus[] = [
      OrderStatus.pending,
      OrderStatus.paid,
      OrderStatus.confirmed,
      OrderStatus.preparing,
      OrderStatus.ready,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in status ${order.status}`);
    }

    return this.recordStatus(orderId, OrderStatus.cancelled, {
      actorId: actor.id,
      note,
    });
  }

  private assertVendorOrAdmin(
    actor: { id: string; role: string; storeId?: string | null },
    storeOwnerId: string | null,
    _storeId: string,
  ) {
    if (actor.role === 'ADMIN') return;
    if (actor.role === 'VENDOR' && storeOwnerId === actor.id) return;
    throw new ForbiddenException('Not allowed to manage this order');
  }
}

export const orderDetailInclude = {
  orderItems: { include: { product: true, store: { omit: storePublicOmit } } },
  charges: true,
  store: {
    select: {
      id: true,
      name: true,
      address: true,
      telephone: true,
      email: true,
      logo: true,
    },
  },
  user: {
    select: { id: true, name: true, email: true, telephone: true, address: true },
  },
  payments: {
    orderBy: { createdAt: 'desc' as const },
    include: { paystackTransaction: true },
  },
  statusEvents: { orderBy: { at: 'asc' as const } },
  assignment: {
    include: {
      rider: {
        select: {
          id: true,
          name: true,
          telephone: true,
          email: true,
          riderProfile: { omit: riderPayoutOmit },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

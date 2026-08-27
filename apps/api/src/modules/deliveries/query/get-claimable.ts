import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  FulfillmentType,
  OrderStatus,
} from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { riderPayoutOmit } from '@shared/system/common/safe-selects';

export class GetClaimableDeliveriesQuery {}

@QueryHandler(GetClaimableDeliveriesQuery)
export class GetClaimableDeliveriesHandler
  implements IQueryHandler<GetClaimableDeliveriesQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const items = await this.prisma.order.findMany({
      where: {
        fulfillmentType: FulfillmentType.delivery,
        status: OrderStatus.ready,
        assignment: null,
      },
      orderBy: { updatedAt: 'asc' },
      include: {
        orderItems: true,
        store: {
          select: { id: true, name: true, address: true, telephone: true },
        },
        user: {
          select: { id: true, name: true, telephone: true, address: true },
        },
      },
      take: 50,
    });
    return { items, total: items.length };
  }
}

export class GetRiderDeliveriesQuery {
  constructor(
    public readonly riderId: string,
    public readonly history = false,
  ) {}
}

@QueryHandler(GetRiderDeliveriesQuery)
export class GetRiderDeliveriesHandler
  implements IQueryHandler<GetRiderDeliveriesQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRiderDeliveriesQuery) {
    const items = await this.prisma.deliveryAssignment.findMany({
      where: {
        riderId: query.riderId,
        ...(query.history
          ? {
              status: { in: ['delivered', 'failed'] },
            }
          : {
              status: { in: ['assigned', 'picked_up', 'in_transit'] },
            }),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        order: {
          include: {
            orderItems: true,
            store: {
              select: { id: true, name: true, address: true, telephone: true },
            },
            user: {
              select: {
                id: true,
                name: true,
                telephone: true,
                address: true,
              },
            },
          },
        },
      },
    });
    return { items, total: items.length };
  }
}

export class GetAvailableRidersQuery {}

@QueryHandler(GetAvailableRidersQuery)
export class GetAvailableRidersHandler
  implements IQueryHandler<GetAvailableRidersQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const items = await this.prisma.user.findMany({
      where: {
        role: 'RIDER',
        riderProfile: { isAvailable: true },
      },
      select: {
        id: true,
        name: true,
        telephone: true,
        email: true,
        riderProfile: { omit: riderPayoutOmit },
      },
    });
    return { items, total: items.length };
  }
}

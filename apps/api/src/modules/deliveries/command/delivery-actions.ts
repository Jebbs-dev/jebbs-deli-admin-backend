import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryAssignmentStatus,
  FulfillmentType,
  OrderStatus,
  Role,
} from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { OrderStatusService } from '../../orders/services/order-status.service';
import { SettlementLedgerService } from '../../settlement/settlement-ledger.service';

export class AssignRiderCommand {
  constructor(
    public readonly orderId: string,
    public readonly riderId: string,
    public readonly actor: { id: string; role: string },
  ) {}
}

@CommandHandler(AssignRiderCommand)
export class AssignRiderHandler implements ICommandHandler<AssignRiderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatusService: OrderStatusService,
  ) {}

  async execute(command: AssignRiderCommand) {
    const order = await this.prisma.order.findUnique({
      where: { id: command.orderId },
      include: {
        store: { select: { userId: true } },
        assignment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (command.actor.role === 'VENDOR' && order.store.userId !== command.actor.id) {
      throw new ForbiddenException('Not your store order');
    }
    if (command.actor.role !== 'ADMIN' && command.actor.role !== 'VENDOR') {
      throw new ForbiddenException('Not allowed');
    }

    if (order.fulfillmentType !== FulfillmentType.delivery) {
      throw new BadRequestException('Cannot assign a rider to a pickup order');
    }
    if (order.status !== OrderStatus.ready && !order.assignment) {
      throw new BadRequestException('Order must be ready before rider assignment');
    }

    const rider = await this.prisma.user.findFirst({
      where: { id: command.riderId, role: Role.RIDER },
      include: { riderProfile: true },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    if (order.assignment) {
      return this.prisma.deliveryAssignment.update({
        where: { orderId: order.id },
        data: {
          riderId: command.riderId,
          status: DeliveryAssignmentStatus.assigned,
          failureReason: null,
          assignedAt: new Date(),
          pickedUpAt: null,
          inTransitAt: null,
          deliveredAt: null,
          failedAt: null,
        },
        include: {
          rider: {
            select: { id: true, name: true, telephone: true, email: true },
          },
        },
      });
    }

    return this.prisma.deliveryAssignment.create({
      data: {
        orderId: order.id,
        riderId: command.riderId,
        status: DeliveryAssignmentStatus.assigned,
      },
      include: {
        rider: {
          select: { id: true, name: true, telephone: true, email: true },
        },
      },
    });
  }
}

export class ClaimDeliveryCommand {
  constructor(
    public readonly orderId: string,
    public readonly riderId: string,
  ) {}
}

@CommandHandler(ClaimDeliveryCommand)
export class ClaimDeliveryHandler implements ICommandHandler<ClaimDeliveryCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ClaimDeliveryCommand) {
    const rider = await this.prisma.user.findFirst({
      where: { id: command.riderId, role: Role.RIDER },
      include: { riderProfile: true },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.riderProfile && !rider.riderProfile.isAvailable) {
      throw new BadRequestException('Rider is not available');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: command.orderId },
      include: { assignment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.fulfillmentType !== FulfillmentType.delivery) {
      throw new BadRequestException('Not a delivery order');
    }
    if (order.status !== OrderStatus.ready) {
      throw new BadRequestException('Order is not ready for claim');
    }
    if (order.assignment) {
      throw new BadRequestException('Order already assigned');
    }

    try {
      return await this.prisma.deliveryAssignment.create({
        data: {
          orderId: order.id,
          riderId: command.riderId,
          status: DeliveryAssignmentStatus.assigned,
        },
        include: {
          order: {
            include: {
              orderItems: true,
              store: {
                select: { id: true, name: true, address: true, telephone: true },
              },
              user: {
                select: { id: true, name: true, telephone: true, address: true },
              },
            },
          },
        },
      });
    } catch {
      throw new BadRequestException('Order already claimed');
    }
  }
}

export class RiderProgressCommand {
  constructor(
    public readonly orderId: string,
    public readonly riderId: string,
    public readonly action: 'pickup' | 'in_transit' | 'delivered' | 'failed',
    public readonly failureReason?: string,
  ) {}
}

@CommandHandler(RiderProgressCommand)
export class RiderProgressHandler implements ICommandHandler<RiderProgressCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatusService: OrderStatusService,
    private readonly settlementLedger: SettlementLedgerService,
  ) {}

  async execute(command: RiderProgressCommand) {
    const assignment = await this.prisma.deliveryAssignment.findUnique({
      where: { orderId: command.orderId },
      include: { order: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.riderId !== command.riderId) {
      throw new ForbiddenException('Not your delivery');
    }

    const map: Record<
      typeof command.action,
      { assignment: DeliveryAssignmentStatus; order: OrderStatus; field: string }
    > = {
      pickup: {
        assignment: DeliveryAssignmentStatus.picked_up,
        order: OrderStatus.picked_up,
        field: 'pickedUpAt',
      },
      in_transit: {
        assignment: DeliveryAssignmentStatus.in_transit,
        order: OrderStatus.in_transit,
        field: 'inTransitAt',
      },
      delivered: {
        assignment: DeliveryAssignmentStatus.delivered,
        order: OrderStatus.delivered,
        field: 'deliveredAt',
      },
      failed: {
        assignment: DeliveryAssignmentStatus.failed,
        order: OrderStatus.failed,
        field: 'failedAt',
      },
    };

    const next = map[command.action];
    const legalFrom: Record<string, DeliveryAssignmentStatus[]> = {
      pickup: [DeliveryAssignmentStatus.assigned],
      in_transit: [
        DeliveryAssignmentStatus.assigned,
        DeliveryAssignmentStatus.picked_up,
      ],
      delivered: [
        DeliveryAssignmentStatus.picked_up,
        DeliveryAssignmentStatus.in_transit,
      ],
      failed: [
        DeliveryAssignmentStatus.assigned,
        DeliveryAssignmentStatus.picked_up,
        DeliveryAssignmentStatus.in_transit,
      ],
    };

    if (!legalFrom[command.action].includes(assignment.status)) {
      throw new BadRequestException(
        `Cannot ${command.action} from assignment status ${assignment.status}`,
      );
    }

    if (command.action === 'failed' && !command.failureReason?.trim()) {
      throw new BadRequestException('failureReason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAssignment = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: next.assignment,
          failureReason: command.failureReason,
          [next.field]: new Date(),
        },
      });

      await this.orderStatusService.recordStatus(
        command.orderId,
        next.order,
        {
          actorId: command.riderId,
          note:
            command.action === 'failed'
              ? command.failureReason
              : `Rider ${command.action}`,
          tx,
        },
      );

      if (command.action === 'delivered') {
        await this.settlementLedger.settleOrderOnDelivered(command.orderId, {
          tx,
          actorId: command.riderId,
        });
      }

      return updatedAssignment;
    });
  }
}

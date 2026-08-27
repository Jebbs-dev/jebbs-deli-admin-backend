import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { OrderAccessService } from '../../orders/services/order-access.service';
import type { Actor } from '@shared/features/auth/access.service';

export class GetPaymentByIdQuery {
  constructor(
    public readonly paymentId: string,
    public readonly actor: Actor,
  ) {}
}

@QueryHandler(GetPaymentByIdQuery)
export class GetPaymentByIdHandler implements IQueryHandler<GetPaymentByIdQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderAccess: OrderAccessService,
  ) {}

  async execute(query: GetPaymentByIdQuery) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: query.paymentId },
      include: { paystackTransaction: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.orderAccess.getOrderForActor(payment.orderId, query.actor);
    return payment;
  }
}

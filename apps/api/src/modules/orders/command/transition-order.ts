import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderStatus } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { OrderStatusService } from '../services/order-status.service';
import { SettlementLedgerService } from '../../settlement/settlement-ledger.service';

export class TransitionOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly nextStatus: OrderStatus,
    public readonly actor: { id: string; role: string; storeId?: string | null },
    public readonly note?: string,
  ) {}
}

@CommandHandler(TransitionOrderCommand)
export class TransitionOrderHandler
  implements ICommandHandler<TransitionOrderCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatusService: OrderStatusService,
    private readonly settlementLedger: SettlementLedgerService,
  ) {}

  async execute(command: TransitionOrderCommand) {
    if (command.nextStatus === OrderStatus.cancelled) {
      return this.orderStatusService.cancelOrder(
        command.orderId,
        command.actor,
        command.note,
      );
    }
    if (command.nextStatus === OrderStatus.delivered) {
      return this.prisma.$transaction(async (tx) => {
        const order = await this.orderStatusService.completePickup(
          command.orderId,
          command.actor,
          { tx },
        );
        await this.settlementLedger.settleOrderOnDelivered(command.orderId, {
          actorId: command.actor.id,
          tx,
        });
        return order;
      });
    }
    return this.orderStatusService.transitionVendor(
      command.orderId,
      command.nextStatus,
      command.actor,
    );
  }
}

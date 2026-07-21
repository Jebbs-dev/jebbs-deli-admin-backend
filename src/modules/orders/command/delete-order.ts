import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class DeleteOrderCommand {
  constructor(public readonly orderId: string) {}
}

@CommandHandler(DeleteOrderCommand)
export class DeleteOrderHandler implements ICommandHandler<DeleteOrderCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteOrderCommand) {
    await this.prisma.order.delete({ where: { id: command.orderId } });
  }
}

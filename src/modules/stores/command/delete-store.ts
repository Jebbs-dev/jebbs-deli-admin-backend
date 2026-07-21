import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class DeleteStoreCommand {
  constructor(public readonly storeId: string) {}
}

@CommandHandler(DeleteStoreCommand)
export class DeleteStoreHandler implements ICommandHandler<DeleteStoreCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteStoreCommand) {
    await this.prisma.store.delete({ where: { id: command.storeId } });
  }
}

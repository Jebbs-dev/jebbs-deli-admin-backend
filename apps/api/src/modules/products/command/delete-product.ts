import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';

export class DeleteProductCommand {
  constructor(
    public readonly actor: Actor,
    public readonly productId: string,
  ) {}
}

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async execute(command: DeleteProductCommand) {
    await this.access.assertProductStoreAccess(command.productId, command.actor);
    await this.prisma.product.delete({ where: { id: command.productId } });
  }
}

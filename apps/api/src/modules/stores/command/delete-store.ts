import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';

export class DeleteStoreCommand {
  constructor(
    public readonly storeId: string,
    public readonly actor: Actor,
  ) {}
}

@CommandHandler(DeleteStoreCommand)
export class DeleteStoreHandler implements ICommandHandler<DeleteStoreCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async execute(command: DeleteStoreCommand) {
    await this.access.assertStoreAccess(command.storeId, command.actor);
    const [productCount, orderCount] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { storeId: command.storeId } }),
      this.prisma.order.count({ where: { storeId: command.storeId } }),
    ]);
    if (orderCount > 0) {
      throw new ConflictException('Cannot delete a store that has orders');
    }
    if (productCount > 0) {
      throw new ConflictException('Cannot delete a store that still has products');
    }
    await this.prisma.store.delete({ where: { id: command.storeId } });
  }
}

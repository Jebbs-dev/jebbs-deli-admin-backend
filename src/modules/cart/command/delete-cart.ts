import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class DeleteCartCommand {
  constructor(public readonly cartId: string) {}
}

@CommandHandler(DeleteCartCommand)
export class DeleteCartHandler implements ICommandHandler<DeleteCartCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteCartCommand) {
    const groups = await this.prisma.cartStoreGroup.findMany({ where: { cartId: command.cartId } });
    for (const group of groups) {
      await this.prisma.cartItem.deleteMany({ where: { cartStoreGroupId: group.id } });
    }
    await this.prisma.cartStoreGroup.deleteMany({ where: { cartId: command.cartId } });
    await this.prisma.cart.delete({ where: { id: command.cartId } });
    return { message: 'Cart deleted successfully' };
  }
}

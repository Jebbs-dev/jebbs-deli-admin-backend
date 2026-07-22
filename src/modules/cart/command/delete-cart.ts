import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class DeleteCartCommand {
  constructor(
    public readonly cartId: string,
    public readonly userId: string,
  ) {}
}

@CommandHandler(DeleteCartCommand)
export class DeleteCartHandler implements ICommandHandler<DeleteCartCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteCartCommand) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: command.cartId },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    if (cart.userId !== command.userId) {
      throw new ForbiddenException('Cannot delete another user cart');
    }

    await this.prisma.cart.delete({ where: { id: command.cartId } });
    return { message: 'Cart deleted successfully' };
  }
}

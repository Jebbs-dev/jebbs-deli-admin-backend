import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class DeleteProductCommand {
  constructor(public readonly productId: string) {}
}

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler implements ICommandHandler<DeleteProductCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteProductCommand) {
    await this.prisma.product.delete({ where: { id: command.productId } });
  }
}

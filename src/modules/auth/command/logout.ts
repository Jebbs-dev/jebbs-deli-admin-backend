import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class LogoutCommand {
  constructor(public readonly userId: string) {}
}

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: LogoutCommand) {
    await this.prisma.token.deleteMany({
      where: { userId: command.userId },
    });
  }
}

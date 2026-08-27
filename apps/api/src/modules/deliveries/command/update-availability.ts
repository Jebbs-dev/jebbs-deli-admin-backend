import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';

export class UpdateRiderAvailabilityCommand {
  constructor(
    public readonly riderId: string,
    public readonly isAvailable: boolean,
  ) {}
}

@CommandHandler(UpdateRiderAvailabilityCommand)
export class UpdateRiderAvailabilityHandler
  implements ICommandHandler<UpdateRiderAvailabilityCommand>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateRiderAvailabilityCommand) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId: command.riderId },
    });
    if (!profile) {
      throw new NotFoundException('Rider profile not found');
    }
    return this.prisma.riderProfile.update({
      where: { userId: command.riderId },
      data: { isAvailable: command.isAvailable },
    });
  }
}

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { riderPayoutOmit } from '@shared/system/common/safe-selects';

export class CreateRiderCommand {
  constructor(
    public readonly data: {
      name: string;
      email: string;
      password: string;
      telephone?: string;
      vehicle?: string;
    },
  ) {}
}

@CommandHandler(CreateRiderCommand)
export class CreateRiderHandler implements ICommandHandler<CreateRiderCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async execute(command: CreateRiderCommand) {
    const { name, email, password, telephone, vehicle } = command.data;
    if (!email || !password || !name) {
      throw new BadRequestException('name, email and password are required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await this.cryptoService.hashPassword(password);
    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        telephone,
        role: Role.RIDER,
        riderProfile: {
          create: {
            isAvailable: true,
            vehicle,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        telephone: true,
        riderProfile: { omit: riderPayoutOmit },
      },
    });
  }
}

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { Role } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { TokenService } from '../services/token.service';
import { riderPayoutOmit } from '@shared/system/common/safe-selects';

export class LoginRiderCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(LoginRiderCommand)
export class LoginRiderHandler implements ICommandHandler<LoginRiderCommand> {
  private readonly logger = new Logger(LoginRiderHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginRiderCommand) {
    const { email, password } = command;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, role: Role.RIDER },
    });

    if (!user || !this.cryptoService.comparePassword(password, user.password)) {
      this.logger.warn(`Failed rider login attempt for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenService.issueTokenPair(user.id);
    const userData = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        telephone: true,
        riderProfile: { omit: riderPayoutOmit },
      },
    });

    return { ...tokens, user: userData };
  }
}

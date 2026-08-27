import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { TokenService } from '../services/token.service';

export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginCommand) {
    const { email, password } = command;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, role: 'USER' },
    });

    if (!user || !this.cryptoService.comparePassword(password, user.password)) {
      this.logger.warn(`Failed login attempt for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenService.issueTokenPair(user.id);

    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        telephone: true,
        avatar: true,
        address: true,
      },
    });

    return {
      ...tokens,
      user: userData,
    };
  }
}

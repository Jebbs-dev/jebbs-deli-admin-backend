import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { CryptoService } from '@libs/shared/features/auth/crypto.service';
import { TokenService } from '../services/token.service';

export class LoginAdminCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(LoginAdminCommand)
export class LoginAdminHandler implements ICommandHandler<LoginAdminCommand> {
  private readonly logger = new Logger(LoginAdminHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginAdminCommand) {
    const { email, password } = command;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, role: 'ADMIN' },
      select: { id: true, email: true, password: true },
    });

    if (!user || !this.cryptoService.comparePassword(password, user.password)) {
      this.logger.warn(`Failed admin login attempt for ${email}`);
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
      },
    });

    return {
      ...tokens,
      user: userData,
    };
  }
}

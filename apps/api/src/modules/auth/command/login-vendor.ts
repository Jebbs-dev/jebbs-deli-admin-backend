import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { TokenService } from '../services/token.service';
import { storePublicOmit } from '@shared/system/common/safe-selects';

export class LoginVendorCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}

@CommandHandler(LoginVendorCommand)
export class LoginVendorHandler implements ICommandHandler<LoginVendorCommand> {
  private readonly logger = new Logger(LoginVendorHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginVendorCommand) {
    const { email, password } = command;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, role: 'VENDOR' },
    });

    if (!user || !this.cryptoService.comparePassword(password, user.password)) {
      this.logger.warn(`Failed vendor login attempt for ${email}`);
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
        store: { omit: storePublicOmit },
      },
    });

    return {
      ...tokens,
      user: userData,
    };
  }
}

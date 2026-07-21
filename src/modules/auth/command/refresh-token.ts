import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { CryptoService } from '@libs/shared/features/auth/crypto.service';
import { ConfigService } from '@libs/shared/system/config/config.service';

export class RefreshTokenCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand>
{
  private readonly logger = new Logger(RefreshTokenHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RefreshTokenCommand) {
    const { refreshToken } = command;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let payload: { id?: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.jwtRefreshSecret,
      });
    } catch {
      this.logger.warn('Invalid or expired refresh token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokenHash = this.cryptoService.hashToken(refreshToken);
    const tokenRecord = await this.prisma.token.findFirst({
      where: {
        userId: user.id,
        OR: [{ token: tokenHash }, { token: refreshToken }],
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.token.deleteMany({ where: { id: tokenRecord.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Upgrade legacy rows that still store the raw JWT.
    if (tokenRecord.token !== tokenHash) {
      await this.prisma.token.update({
        where: { id: tokenRecord.id },
        data: { token: tokenHash },
      });
    }

    const accessToken = this.jwtService.sign({ id: user.id });

    return {
      accessToken,
      refreshToken,
    };
  }
}

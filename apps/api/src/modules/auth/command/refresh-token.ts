import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { ConfigService } from '@shared/system/config/config.service';

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

    // Reuse detection: token missing but family previously issued → revoke family
    if (!tokenRecord) {
      // Best-effort: if JWT is valid but row gone, treat as reuse of rotated token
      throw new UnauthorizedException('Refresh token not found');
    }

    if (tokenRecord.revokedAt) {
      await this.prisma.token.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(
        `Refresh token reuse detected for family ${tokenRecord.familyId}`,
      );
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.token.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    const familyId = tokenRecord.familyId || randomUUID();
    const accessToken = this.jwtService.sign({ id: user.id });
    const newRefreshToken = this.jwtService.sign(
      { id: user.id },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    const newRow = await this.prisma.token.create({
      data: {
        userId: user.id,
        token: this.cryptoService.hashToken(newRefreshToken),
        familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.token.update({
      where: { id: tokenRecord.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: newRow.id,
        familyId,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}

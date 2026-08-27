import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@shared/system/database/prisma.service';
import { CryptoService } from '@shared/features/auth/crypto.service';
import { ConfigService } from '@shared/system/config/config.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(userId: string, familyId?: string) {
    const accessToken = this.jwtService.sign({ id: userId });
    const refreshToken = this.jwtService.sign(
      { id: userId },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    const family = familyId ?? randomUUID();

    await this.prisma.token.create({
      data: {
        userId,
        token: this.cryptoService.hashToken(refreshToken),
        familyId: family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, familyId: family };
  }

  async revokeFamily(familyId: string) {
    await this.prisma.token.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

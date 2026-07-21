import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { CryptoService } from '@libs/shared/features/auth/crypto.service';
import { ConfigService } from '@libs/shared/system/config/config.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(userId: string) {
    const accessToken = this.jwtService.sign({ id: userId });
    const refreshToken = this.jwtService.sign(
      { id: userId },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: '7d',
      },
    );

    await this.prisma.token.create({
      data: {
        userId,
        token: this.cryptoService.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}

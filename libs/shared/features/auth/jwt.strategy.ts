import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '@shared/system/database/prisma.service';
import { ConfigService } from '@shared/system/config/config.service';
import {
  riderPayoutOmit,
  storePublicOmit,
} from '@shared/system/common/safe-selects';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: { id: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      omit: { password: true },
      include: {
        store: { omit: storePublicOmit },
        riderProfile: { omit: riderPayoutOmit },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@shared/system/config/config.module';
import { ConfigService } from '@shared/system/config/config.service';
import { JwtStrategy } from './jwt.strategy';
import { CryptoService } from './crypto.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { CsrfGuard } from './csrf.guard';
import { AccessService } from './access.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    JwtStrategy,
    CryptoService,
    AccessService,
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
  exports: [
    PassportModule,
    JwtModule,
    JwtStrategy,
    CryptoService,
    AccessService,
  ],
})
export class AuthModule {}

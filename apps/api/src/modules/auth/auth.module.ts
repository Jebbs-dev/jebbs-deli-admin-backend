import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule as SharedAuthModule } from '@shared/features/auth/auth.module';
import { AuthController } from './auth.controller';
import { LoginHandler } from './command/login';
import { LoginAdminHandler } from './command/login-admin';
import { LoginVendorHandler } from './command/login-vendor';
import { RefreshTokenHandler } from './command/refresh-token';
import { LogoutHandler } from './command/logout';
import { LoginRiderHandler } from './command/login-rider';
import { CreateRiderHandler } from './command/create-rider';
import { TokenService } from './services/token.service';

const CommandHandlers = [
  LoginHandler,
  LoginAdminHandler,
  LoginVendorHandler,
  LoginRiderHandler,
  CreateRiderHandler,
  RefreshTokenHandler,
  LogoutHandler,
];

@Module({
  imports: [CqrsModule, SharedAuthModule],
  controllers: [AuthController],
  providers: [...CommandHandlers, TokenService],
})
export class AuthModule {}

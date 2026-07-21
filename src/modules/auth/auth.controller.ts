import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';
import { LoginCommand } from './command/login';
import { LoginAdminCommand } from './command/login-admin';
import { LoginVendorCommand } from './command/login-vendor';
import { RefreshTokenCommand } from './command/refresh-token';
import { LogoutCommand } from './command/logout';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '@libs/shared/features/auth/decorators/current-user.decorator';
import { Public } from '@libs/shared/features/auth/decorators/public.decorator';
import { AuthTokensResponseDto } from '@libs/shared/system/common/schemas/response.schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('login')
  @ZodResponse({
    status: 200,
    description: 'Returns access and refresh tokens for a customer login',
    type: AuthTokensResponseDto,
  })
  async login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  @Public()
  @Post('admin/login')
  @ZodResponse({
    status: 200,
    description: 'Returns access and refresh tokens for an admin login',
    type: AuthTokensResponseDto,
  })
  async adminLogin(@Body() dto: LoginDto) {
    return this.commandBus.execute(
      new LoginAdminCommand(dto.email, dto.password),
    );
  }

  @Public()
  @Post('vendor/login')
  @ZodResponse({
    status: 200,
    description: 'Returns access and refresh tokens for a vendor login',
    type: AuthTokensResponseDto,
  })
  async vendorLogin(@Body() dto: LoginDto) {
    return this.commandBus.execute(
      new LoginVendorCommand(dto.email, dto.password),
    );
  }

  @Public()
  @Post('refresh')
  @ZodResponse({
    status: 200,
    description: 'Returns a new access and refresh token pair',
    type: AuthTokensResponseDto,
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.commandBus.execute(new RefreshTokenCommand(dto.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser('id') userId: string) {
    await this.commandBus.execute(new LogoutCommand(userId));
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';
import { Request, Response } from 'express';
import { LoginCommand } from './command/login';
import { LoginAdminCommand } from './command/login-admin';
import { LoginVendorCommand } from './command/login-vendor';
import { RefreshTokenCommand } from './command/refresh-token';
import { LogoutCommand } from './command/logout';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '@libs/shared/features/auth/decorators/current-user.decorator';
import { Public } from '@libs/shared/features/auth/decorators/public.decorator';
import {
  AuthLoginResponseDto,
  MessageResponseDto,
  UserWrapperResponseDto,
} from '@libs/shared/system/common/schemas/response.schemas';
import { clearAuthCookies, setAuthCookies } from './utils/auth-cookies';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Logs in a customer and sets auth cookies',
    type: AuthLoginResponseDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LoginCommand(dto.email, dto.password),
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Login successful', user: result.user };
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Logs in an admin and sets auth cookies',
    type: AuthLoginResponseDto,
  })
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LoginAdminCommand(dto.email, dto.password),
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Admin login successful', user: result.user };
  }

  @Public()
  @Post('vendor/login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Logs in a vendor and sets auth cookies',
    type: AuthLoginResponseDto,
  })
  async vendorLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.commandBus.execute(
      new LoginVendorCommand(dto.email, dto.password),
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Vendor login successful', user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Refreshes access token cookie from refresh token cookie',
    type: MessageResponseDto,
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const result = await this.commandBus.execute(
      new RefreshTokenCommand(refreshToken),
    );
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { message: 'Token refreshed successfully' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    status: 200,
    description: 'Revokes refresh tokens and clears auth cookies',
    type: MessageResponseDto,
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.commandBus.execute(new LogoutCommand(userId));
    clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @ZodResponse({
    status: 200,
    description: 'Returns the currently authenticated user',
    type: UserWrapperResponseDto,
  })
  async profile(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }
}

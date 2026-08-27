import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@shared/features/auth/decorators/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

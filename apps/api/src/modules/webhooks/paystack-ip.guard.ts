import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@shared/system/config/config.service';

/** Paystack documented webhook IP ranges (IPv4). */
export const PAYSTACK_WEBHOOK_IPS = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220',
];

/**
 * In production, only allows Paystack webhook source IPs.
 */
@Injectable()
export class PaystackIpGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.nodeEnv !== 'production') {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    const allowed =
      this.config.paystackWebhookIps.length > 0
        ? this.config.paystackWebhookIps
        : PAYSTACK_WEBHOOK_IPS;
    if (!allowed.some((entry) => ip.includes(entry))) {
      throw new UnauthorizedException('Webhook source IP not allowed');
    }
    return true;
  }
}

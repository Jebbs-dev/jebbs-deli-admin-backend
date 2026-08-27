import {
  Controller,
  Post,
  Req,
  Headers,
  UnauthorizedException,
  HttpCode,
  Logger,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@shared/features/auth/decorators/public.decorator';
import { PaystackService } from '@shared/provider/payment/paystack.service';
import { PaystackWebhookService } from './paystack-webhook.service';
import { PaystackIpGuard } from './paystack-ip.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly paystackWebhookService: PaystackWebhookService,
  ) {}

  @Public()
  @SkipThrottle()
  @UseGuards(PaystackIpGuard)
  @Post('webhooks/paystack')
  @HttpCode(200)
  async handlePaystack(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    return this.acceptPaystackWebhook(req, signature);
  }

  /** Legacy path kept for existing Paystack dashboard configs */
  @Public()
  @SkipThrottle()
  @UseGuards(PaystackIpGuard)
  @Post('payment/webhook')
  @HttpCode(200)
  async handlePaystackLegacy(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    return this.acceptPaystackWebhook(req, signature);
  }

  private async acceptPaystackWebhook(
    req: RawBodyRequest<Request>,
    signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBuf =
      req.rawBody ??
      Buffer.from(
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      );

    if (!this.paystackService.verifyWebhookSignature(rawBuf, signature)) {
      this.logger.warn('Rejected Paystack webhook: invalid signature');
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    const payload = JSON.parse(rawBuf.toString('utf8')) as {
      event: string;
      data: Record<string, unknown>;
    };

    // Await processing so Paystack retries on failure (non-2xx).
    await this.paystackWebhookService.processEvent(
      payload as Parameters<PaystackWebhookService['processEvent']>[0],
      signature,
    );

    return { received: true };
  }
}

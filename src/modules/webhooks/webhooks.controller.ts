import {
  Controller,
  Post,
  Req,
  Headers,
  UnauthorizedException,
  HttpCode,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@libs/shared/features/auth/decorators/public.decorator';
import { PaystackService } from '@libs/shared/provider/payment/paystack.service';
import { PaystackWebhookService } from './paystack-webhook.service';

@Controller()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly paystackWebhookService: PaystackWebhookService,
  ) {}

  @Public()
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
  @Post('payment/webhook')
  @HttpCode(200)
  async handlePaystackLegacy(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    return this.acceptPaystackWebhook(req, signature);
  }

  private acceptPaystackWebhook(
    req: RawBodyRequest<Request>,
    signature: string | undefined,
  ): { received: boolean } {
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

    setImmediate(() => {
      void this.paystackWebhookService
        .processEvent(
          payload as Parameters<PaystackWebhookService['processEvent']>[0],
          signature,
        )
        .catch((err: unknown) => {
          this.logger.error(
            `Async Paystack webhook failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    });

    return { received: true };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@libs/shared/system/config/config.service';
import { renderOrderPaidEmail } from '@emails/order-paid';

export type OrderPaidEmailInput = {
  to: string;
  name: string;
  orderId: string;
  amount: string;
  currency: string;
  reference: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.resendApiKey;
    this.fromEmail = this.configService.resendFromEmail;
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set; emails will be skipped');
    }
  }

  async sendOrderPaidEmail(input: OrderPaidEmailInput): Promise<void> {
    if (!this.resend) {
      this.logger.debug(`Skip order paid email to ${input.to} (no Resend key)`);
      return;
    }

    const { subject, html } = renderOrderPaidEmail(input);

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send order paid email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Failed to send order paid email');
    }
  }
}

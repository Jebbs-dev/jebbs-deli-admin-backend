import { Injectable, Logger } from '@nestjs/common';
import type { ReactElement } from 'react';
import { Resend } from 'resend';
import { ConfigService } from '@libs/shared/system/config/config.service';
import OrderPaidEmail, {
  type OrderPaidEmailProps,
} from '@emails/order-paid';
import WalletTopupEmail, {
  type WalletTopupEmailProps,
} from '@emails/wallet-topup';

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

  sendOrderPaidEmail(input: OrderPaidEmailProps & { to: string }) {
    const { to, ...props } = input;
    return this.send({
      to,
      subject: `Payment confirmed for order ${props.orderId}`,
      react: OrderPaidEmail(props),
      label: 'order paid email',
    });
  }

  sendWalletTopupEmail(input: WalletTopupEmailProps & { to: string }) {
    const { to, ...props } = input;
    return this.send({
      to,
      subject: `Wallet top-up of ${props.currency} ${props.amount} confirmed`,
      react: WalletTopupEmail(props),
      label: 'wallet top-up email',
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    react: ReactElement;
    label: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.debug(`Skip ${options.label} to ${options.to} (no Resend key)`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        react: options.react,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send ${options.label}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(`Failed to send ${options.label}`);
    }
  }
}

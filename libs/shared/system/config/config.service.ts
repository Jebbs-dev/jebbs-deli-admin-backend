import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  constructor() {
    const required =
      this.nodeEnv === 'production'
        ? ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
        : ['DATABASE_URL'];
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }
    if (this.nodeEnv === 'production' && !process.env.PAYSTACK_SECRET_KEY) {
      throw new Error('Missing required environment variable: PAYSTACK_SECRET_KEY');
    }
  }

  get port(): number {
    return Number(process.env.PORT) || 8080;
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get databaseUrl(): string {
    return process.env.DATABASE_URL || '';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || '';
  }

  get sessionSecret(): string {
    return process.env.SESSION_SECRET || 'cart-session-secret';
  }

  get paystackSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || '';
  }

  get paystackWebhookIps(): string[] {
    const raw = process.env.PAYSTACK_WEBHOOK_IPS || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get jwtRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || this.jwtSecret;
  }

  get resendApiKey(): string {
    return process.env.RESEND_API_KEY || '';
  }

  get resendFromEmail(): string {
    return process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }

  get cloudinaryCloudName(): string {
    return process.env.CLOUDINARY_CLOUD_NAME || '';
  }

  get cloudinaryApiKey(): string {
    return process.env.CLOUDINARY_API_KEY || '';
  }

  get cloudinaryApiSecret(): string {
    return process.env.CLOUDINARY_API_SECRET || '';
  }
}

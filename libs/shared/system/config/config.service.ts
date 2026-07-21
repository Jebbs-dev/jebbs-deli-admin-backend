import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
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

import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@libs/shared/system/config/config.service';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.paystackSecretKey;
  }

  private paystackErrorMessage(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data as { message?: string } | undefined;
      if (typeof data?.message === 'string' && data.message.length > 0) {
        return data.message;
      }
      return err.message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Paystack request failed';
  }

  private async fetchPaystackResponse(
    url: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>,
  ) {
    if (!this.secretKey) {
      throw new BadRequestException('Paystack secret key is not configured');
    }

    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    };

    try {
      if (method === 'GET') {
        return await axios.get(url, config);
      }
      return await axios.post(url, data, config);
    } catch (err) {
      throw new BadRequestException(this.paystackErrorMessage(err));
    }
  }

  async initializeTransaction(data: Record<string, unknown>) {
    const url = 'https://api.paystack.co/transaction/initialize';
    const response = await this.fetchPaystackResponse(url, 'POST', data);
    const payload = response.data?.data;
    if (!payload?.authorization_url || !payload?.access_code) {
      throw new BadRequestException(
        response.data?.message || 'Paystack did not return checkout details',
      );
    }
    const { reference, access_code, authorization_url } = payload;
    return { reference, access_code, authorization_url };
  }

  async verifyTransaction(reference: string) {
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    const paystackResponse = await this.fetchPaystackResponse(url, 'GET');
    return paystackResponse.data;
  }

  async listTransactions() {
    const url = 'https://api.paystack.co/transaction';
    const paystackResponse = await this.fetchPaystackResponse(url, 'GET');
    return paystackResponse.data;
  }

  async fetchTransactionById(id: number) {
    const url = `https://api.paystack.co/transaction/${id}`;
    const paystackResponse = await this.fetchPaystackResponse(url, 'GET');
    return paystackResponse.data;
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader || !this.secretKey) {
      return false;
    }
    const hash = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signatureHeader;
  }
}

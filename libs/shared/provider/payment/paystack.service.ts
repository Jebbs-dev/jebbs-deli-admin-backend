import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@libs/shared/system/config/config.service';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class PaystackService {
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    this.secretKey = configService.paystackSecretKey;
  }

  private async fetchPaystackResponse(
    url: string,
    method: 'GET' | 'POST',
    data?: Record<string, unknown>,
  ) {
    const config: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    };

    if (method === 'GET') {
      return axios.get(url, config);
    }

    return axios.post(url, data, config);
  }

  async initializeTransaction(data: Record<string, unknown>) {
    const url = 'https://api.paystack.co/transaction/initialize';
    const response = await this.fetchPaystackResponse(url, 'POST', data);
    const { reference, access_code, authorization_url } = response.data.data;
    return { reference, access_code, authorization_url };
  }

  async verifyTransaction(reference: string) {
    const url = `https://api.paystack.co/transaction/verify/${reference}`;
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

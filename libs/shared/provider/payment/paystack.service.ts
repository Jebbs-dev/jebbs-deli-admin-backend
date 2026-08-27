import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@shared/system/config/config.service';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { verifyPaystackSignature } from './paystack-signature';

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
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Paystack request failed';
  }

  private async fetchPaystackResponse(
    url: string,
    method: 'GET' | 'POST' | 'PUT',
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
      if (method === 'PUT') {
        return await axios.put(url, data, config);
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

  async listBanks(currency = 'NGN') {
    const url = `https://api.paystack.co/bank?currency=${encodeURIComponent(currency)}`;
    const response = await this.fetchPaystackResponse(url, 'GET');
    return response.data?.data ?? [];
  }

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
    const response = await this.fetchPaystackResponse(url, 'GET');
    const data = response.data?.data;
    if (!data?.account_name) {
      throw new BadRequestException(
        response.data?.message || 'Could not resolve account',
      );
    }
    return {
      accountNumber: data.account_number as string,
      accountName: data.account_name as string,
      bankId: data.bank_id as number | undefined,
    };
  }

  async createSubaccount(payload: {
    business_name: string;
    settlement_bank: string;
    account_number: string;
    percentage_charge?: number;
    description?: string;
    primary_contact_email?: string;
    primary_contact_name?: string;
    primary_contact_phone?: string;
  }) {
    const url = 'https://api.paystack.co/subaccount';
    const response = await this.fetchPaystackResponse(url, 'POST', {
      ...payload,
      percentage_charge: payload.percentage_charge ?? 0,
    });
    const data = response.data?.data;
    if (!data?.subaccount_code) {
      throw new BadRequestException(
        response.data?.message || 'Failed to create subaccount',
      );
    }
    return {
      subaccountCode: data.subaccount_code as string,
      id: data.id as number | undefined,
      raw: data,
    };
  }

  async updateSubaccount(
    codeOrId: string,
    payload: Record<string, unknown>,
  ) {
    const url = `https://api.paystack.co/subaccount/${encodeURIComponent(codeOrId)}`;
    const response = await this.fetchPaystackResponse(url, 'PUT', payload);
    const data = response.data?.data;
    if (!data?.subaccount_code) {
      throw new BadRequestException(
        response.data?.message || 'Failed to update subaccount',
      );
    }
    return {
      subaccountCode: data.subaccount_code as string,
      raw: data,
    };
  }

  async createTransferRecipient(payload: {
    type?: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }) {
    const url = 'https://api.paystack.co/transferrecipient';
    const response = await this.fetchPaystackResponse(url, 'POST', {
      type: payload.type ?? 'nuban',
      name: payload.name,
      account_number: payload.account_number,
      bank_code: payload.bank_code,
      currency: payload.currency ?? 'NGN',
    });
    const data = response.data?.data;
    if (!data?.recipient_code) {
      throw new BadRequestException(
        response.data?.message || 'Failed to create transfer recipient',
      );
    }
    return {
      recipientCode: data.recipient_code as string,
      raw: data,
    };
  }

  async initiateTransfer(payload: {
    amount: number;
    recipient: string;
    reference: string;
    reason?: string;
    currency?: string;
  }) {
    const url = 'https://api.paystack.co/transfer';
    const response = await this.fetchPaystackResponse(url, 'POST', {
      source: 'balance',
      amount: payload.amount,
      recipient: payload.recipient,
      reference: payload.reference,
      reason: payload.reason,
      currency: payload.currency ?? 'NGN',
    });
    const data = response.data?.data;
    if (!data?.transfer_code && !data?.reference) {
      throw new BadRequestException(
        response.data?.message || 'Failed to initiate transfer',
      );
    }
    return {
      transferCode: (data.transfer_code as string) ?? null,
      reference: (data.reference as string) ?? payload.reference,
      status: data.status as string | undefined,
      raw: data,
    };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    return verifyPaystackSignature(rawBody, signatureHeader, this.secretKey);
  }
}

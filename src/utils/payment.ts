import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export const secretKey = process.env.PAYSTACK_SECRET_KEY;

type AxiosMethod = (
  url: string,
  data?: any,
  config?: AxiosRequestConfig
) => Promise<AxiosResponse>;

/**
 * Generic fetch wrapper for Paystack
 */
const fetchPaystackResponse = async (
  url: string,
  method: AxiosMethod,
  data?: Record<string, any>
) => {
  const config: AxiosRequestConfig = {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  };

  // If the method is GET, pass only config
  if (method === axios.get) {
    return await method(url, config);
  }

  // For POST, send data + config
  return await method(url, data, config);
};

export const InitialiseTransaction = async (data: Record<string, any>) => {
  const url = "https://api.paystack.co/transaction/initialize";

  try {
    const response = await fetchPaystackResponse(url, axios.post, data);

    const { reference, access_code, authorization_url } = response.data.data;

    return { reference, access_code, authorization_url };
  } catch (error) {
    console.error("Paystack error:", error);
    throw error;
  }
};

export const verifyTransaction = async (reference: string) => {
  const url = `https://api.paystack.co/transaction/verify/${reference}`;

  try {
    const paystackResponse = await fetchPaystackResponse(url, axios.get);

    return paystackResponse.data;
  } catch (error) {
    console.error("Paystack error:", error);
    throw error;
  }
};

export const listTransactions = async () => {
  const url = "https://api.paystack.co/transaction";

  try {
    const paystackResponse = await fetchPaystackResponse(url, axios.get);

    return paystackResponse.data;
  } catch (error) {
    console.error("Paystack error:", error);
    throw error;
  }
};

export const fetchTransactionById = async (id: number) => {
  const url = `https://api.paystack.co/transaction/${id}`;

  try {
    const paystackResponse = await fetchPaystackResponse(url, axios.get);

    return paystackResponse.data;
  } catch (error) {
    console.error("Paystack error:", error);
    throw error;
  }
};

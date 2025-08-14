import prisma from "@/utils/prisma";
import { InitialisePaymentProps } from "./types/payment.types";
import axios from "axios";
import {
  fetchTransactionById,
  InitialiseTransaction,
  listTransactions,
  verifyTransaction,
} from "@/utils/payment";
import { access } from "fs";

class PaymentService {
  private prisma = prisma;

  /**
   * Initialise Payment
   */

  public initialisePayment = async (
    data: InitialisePaymentProps,
    userId: string,
    storeId: string,
    orderId: string
  ) => {
    const paystackResponse = await InitialiseTransaction(data);

    const { reference, access_code, authorization_url } = paystackResponse;

    try {
      const createdPayment = await this.prisma.payment.create({
        data: {
          amount: parseFloat(data.amount) / 100,
          userId,
          storeId,
          orderId,
          reference,
          currency: data.currency,
        },
      });

      await this.prisma.paystackTransaction.create({
        data: {
          reference,
          paymentId: createdPayment.id,
          amount: createdPayment.amount,
          currency: createdPayment.currency,
        },
      });

      return {
        payment: createdPayment,
        redirectUrl: authorization_url,
        access_code,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to initial payment"
      );
    }
  };

  public verifyPayment = async (reference: string) => {
    const paystackResponse = await verifyTransaction(reference);

    const dataFromPaystackResponse = paystackResponse.data;

    // return paystackResponse;

    try {
      await this.prisma.paystackTransaction.update({
        where: {
          reference,
        },
        data: {
          id: BigInt(dataFromPaystackResponse.id),
          receiptNumber: dataFromPaystackResponse.receipt_number,
          requestedAmount: dataFromPaystackResponse.requested_amount,
          gatewayResponse: dataFromPaystackResponse.gateway_response,
          posTransactionData: dataFromPaystackResponse.pos_transaction_data,
          paidAt: dataFromPaystackResponse.paid_at,
          customer: dataFromPaystackResponse.customer,
          authorization: dataFromPaystackResponse.authorization,
          fees: dataFromPaystackResponse.fees,
          log: dataFromPaystackResponse.log,
          channel: dataFromPaystackResponse.channel,
          status: dataFromPaystackResponse.status,
          domain: dataFromPaystackResponse.domain,
          createdAt: dataFromPaystackResponse.created_at,
          currency: dataFromPaystackResponse.currency,
          ipAddress: dataFromPaystackResponse.ip_address,
        },
      });

      if (!paystackResponse) {
        throw new Error("Transaction not found!");
      }

      if (!dataFromPaystackResponse.paidAt) {
        return {
          success: false,
          message: "Transaction not yet paid",
          data: dataFromPaystackResponse,
        };
      }

      const updatedPayment = await prisma.payment.update({
        where: {
          reference,
        },
        data: {
          paidAt: dataFromPaystackResponse.paid_at,
          status: dataFromPaystackResponse.status,
          paymentMethod: dataFromPaystackResponse.channel,
          paystackId: BigInt(dataFromPaystackResponse.id),
        },
      });

      return {
        ...updatedPayment,
        paystackId: Number(updatedPayment.paystackId),
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to verify payment"
      );
    }
  };

  public adminVerifyTransaction = async (reference: string) => {
    const paystackResponse = await verifyTransaction(reference);

    const dataFromPaystackResponse = paystackResponse.data;

    try {
      if (!paystackResponse) {
        throw new Error("Transaction not found!");
      }

      if (!dataFromPaystackResponse.paidAt) {
        return {
          success: false,
          message: "Transaction not yet paid",
          data: dataFromPaystackResponse,
        };
      }

      return paystackResponse;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to verify payment"
      );
    }
  };

  public fetchPayments = async () => {
    const paystackResponse = await listTransactions();

    // const dataFromPaystackResponse = paystackResponse.data;

    const fetchedPaymentDetails = await this.prisma.payment.findMany({});

    // Convert BigInt fields to string
    const serialized = fetchedPaymentDetails.map((payment) => ({
      ...payment,
      paystackId: Number(payment.paystackId!), // Convert BigInt to string
    }));

    return serialized;
  };

  public fetchPaymentByUserId = async (userId: string, filters?: any) => {
    const {
      offset,
      limit,
      startDate,
      endDate,
      sortBy = "createAt",
      sortOrder = "desc",
    } = filters || {};

    try {
      const whereClause: any = {
        userId,
      };

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [paymentDetails, total] = await prisma.$transaction([
        prisma.payment.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            paystackTransaction: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.payment.count({ where: whereClause }),
      ]);

      return {
        paymentDetails,
        limit: limitNumber,
        offset: offsetNumber,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to fetch payment details"
      );
    }
  };

  public fetchPaymentByStoreId = async (storeId: string, filters?: any) => {
    const {
      offset,
      limit,
      startDate,
      endDate,
      sortBy = "createAt",
      sortOrder = "desc",
    } = filters || {};

    try {
      const whereClause: any = {
        storeId,
      };

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [paymentDetails, total] = await prisma.$transaction([
        prisma.payment.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            paystackTransaction: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.payment.count({ where: whereClause }),
      ]);

      return {
        paymentDetails,
        limit: limitNumber,
        offset: offsetNumber,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to fetch payment details"
      );
    }
  };

  public fetchPaymentByOrderId = async (orderId: string) => {
    try {
      const paymmentByOrder = await this.prisma.payment.findMany({
        where: {
          orderId,
        },
      });

      return paymmentByOrder;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to fetch payment details"
      );
    }
  };

  public fetchPaymentById = async (id: string) => {
    const fetchPaymentDetails = await this.prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        paystackTransaction: true,
      },
    });

    const paystackPaymentId = fetchPaymentDetails?.paystackTransaction?.id;

    const paystackResponse = await fetchTransactionById(
      Number(paystackPaymentId)
    );

    return fetchPaymentDetails;
  };

  private getPaymentEnum = (selectedItem: string) => {
    const channels = [
      "card",
      "bank",
      "apple_pay",
      "ussd",
      "qr",
      "mobile_money",
      "bank_transfer",
      "eft",
    ];
    const matched = channels.find((c) => c.toLowerCase() === selectedItem);
    return matched;
  };
}

export default PaymentService;

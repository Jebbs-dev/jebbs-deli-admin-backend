import PaymentService from "./payment.service";
import { Request, Response, NextFunction } from "express";
import HttpException from "@/utils/exceptions/http.exception";
import prisma from "@/utils/prisma";
import crypto from "crypto";
import { secretKey } from "@/utils/payment";

class PaymentController {
  private paymentService = new PaymentService();
  private prisma = prisma;

  public initilisePayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { paymentData, userId, storeId, orderId } = req.body;

      const payment = await this.paymentService.initialisePayment(
        paymentData,
        userId,
        storeId,
        orderId
      );

      res.status(201).json({ payment });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to initialise payment"
        )
      );
    }
  };

  public verifyPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { reference } = req.params;

      const payment = await this.paymentService.verifyPayment(reference);

      res.status(200).send(payment);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to verify payment"
        )
      );
    }
  };

  public adminVerifyPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { reference } = req.params;

      const payment = await this.paymentService.adminVerifyTransaction(
        reference
      );

      res.status(200).send(payment);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to verify payment"
        )
      );
    }
  };

  public fetchPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const paymentDetails = await this.paymentService.fetchPayments();

      res.status(200).send(paymentDetails);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch payment details"
        )
      );
    }
  };

  public fetchPaymentByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId } = req.params;
      const query = req.query;

      const paymentDetails = await this.paymentService.fetchPaymentByUserId(
        userId,
        query
      );

      res.status(200).send(paymentDetails);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch payment details"
        )
      );
    }
  };

  public fetchPaymentByStoreId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { storeId } = req.params;
      const query = req.query;

      const paymentDetails = await this.paymentService.fetchPaymentByStoreId(
        storeId,
        query
      );

      res.status(200).send(paymentDetails);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch payment details"
        )
      );
    }
  };

  public fetchPaymentByOrderId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { orderId } = req.params;

      const paymentDetails = await this.paymentService.fetchPaymentByOrderId(
        orderId
      );

      res.status(200).send(paymentDetails);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch payment details"
        )
      );
    }
  };

  public fetchPaymentById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const paymentDetails = await this.paymentService.fetchPaymentById(id);

      res.status(200).send(paymentDetails);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch payment details"
        )
      );
    }
  };

  public paystackWebhookHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const hash = crypto
      .createHmac("sha512", secretKey || "")
      .update(JSON.stringify(req.body))
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    // 🛡️ Verify webhook signature
    if (hash !== signature) {
      res.status(401).json({ error: "Unauthorized: Invalid signature" });
      return;
    }

    const event = req.body;

    try {
      const { event: eventType, data } = event;

      if (eventType === "charge.success") {
        const reference = data.reference;

        const existingTransaction = await prisma.paystackTransaction.findUnique(
          {
            where: { reference },
          }
        );

        if (!existingTransaction) {
          console.error(
            "No matching transaction found for reference:",
            reference
          );
          res.status(404).json({ error: "Transaction not found" });
          return;
        }

        // Update the transaction and linked payment
        await prisma.paystackTransaction.update({
          where: { reference },
          data: {
            ...data,
            webhookVerified: true,
            webhookSignature: signature as string,
            webhookReceivedAt: new Date(),
          },
        });

        await prisma.payment.update({
          where: {
            id: existingTransaction.paymentId,
          },
          data: {
            paidAt: new Date(data.paid_at),
            paymentMethod: data.channel,
            description: data.message,
          },
        });

        res.status(200).json({ status: "success" });
        return;
      }

      // Handle failed payments
      if (eventType === "charge.failed") {
        res.status(404).json({ error: "Transaction failed. Try again" });
        return;
      }

      // Other event types you may want to handle:
      // - transfer.success
      // - transfer.failed
      // - subscription.create
      // - invoice.payment_failed

      res.status(200).json({ received: true });
      return;
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Internal Server Error"
        )
      );
      console.error("Webhook handling error:", error);
      return;
    }
  };
}

export default PaymentController;

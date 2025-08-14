import RouteController from "@/utils/interfaces/route.controller.interface";
import express, { Router } from "express";
import PaymentController from "./payment.controller";
import authenticated from "@/middlewares/auth/auth.middleware";

class PaymentRouter implements RouteController {
  public path = "/payment";
  public router: Router = Router();

  private paymentcontroller = new PaymentController();

  private rawBodySaver(req: any, res: any, buf: Buffer, encoding: string) {
    if (buf && buf.length) {
      req.rawBody = buf.toString((encoding || "utf8") as BufferEncoding);
    }
  }

  constructor() {
    this.initialiseRoutes();
  }

  initialiseRoutes() {
    this.router.post(
      `${this.path}/initialise`,
      authenticated,
      this.paymentcontroller.initilisePayment
    );
    this.router.get(
      `${this.path}/verify/:reference`,
      authenticated,
      this.paymentcontroller.verifyPayment
    );
    this.router.get(
      `${this.path}/admin/verify/:reference`,
      authenticated,
      this.paymentcontroller.adminVerifyPayment
    );
    this.router.get(
      `${this.path}/`,
      authenticated,
      this.paymentcontroller.fetchPayment
    );
    this.router.get(
      `${this.path}/store/:storeId`,
      authenticated,
      this.paymentcontroller.fetchPaymentByStoreId
    );
    this.router.get(
      `${this.path}/store/:storeId`,
      authenticated,
      this.paymentcontroller.fetchPaymentByStoreId
    );
    this.router.get(
      `${this.path}/user/:userId`,
      authenticated,
      this.paymentcontroller.fetchPaymentByUserId
    );
    this.router.get(
      `${this.path}/order/:orderId`,
      authenticated,
      this.paymentcontroller.fetchPaymentByOrderId
    );
    this.router.get(
      `${this.path}/:id`,
      authenticated,
      this.paymentcontroller.fetchPaymentById
    );
    this.router.post(
      `/webhook/paystack`,
      express.json({ verify: this.rawBodySaver }),
      this.paymentcontroller.paystackWebhookHandler
    );
  }
}

export default PaymentRouter;

import { Request, Response, NextFunction } from "express";
import OrderService from "./order.service";

class OrderController {
  private orderService = new OrderService();

  public createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { orderData } = req.body;

      const order = await this.orderService.createOrder(orderData);

      res.status(201).json({ order });
    } catch (error) {
      next(new Error("Unable to create order"));
    }
  };

  public fetchOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const orders = await this.orderService.fetchOrders();

      res.status(200).send(orders);
    } catch (error) {
      next(new Error("Unable to fetch orders"));
    }
  }

  public fetchSingleOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { orderId } = req.params;

      const order = await this.orderService.fetchSingleOrder(orderId);

      if (!order) {
        throw new Error("Order not found");
      }

      res.status(200).send(order);
    } catch (error) {
      next(new Error("Unable to fetch order"));
    }
  }
}

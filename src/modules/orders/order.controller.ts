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
      const { orderData, orderItems } = req.body;

      const order = await this.orderService.createOrder(orderData, orderItems);

      res.status(201).json({ order });
    } catch (error) {
      next(new Error("Unable to create order"));
    }
  };

  public updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { orderId } = req.params;
      const { orderData, orderItems } = req.body;

      const updatedOrder = await this.orderService.updateOrder(
        orderId,
        orderData,
        orderItems
      );

      res.status(200).json({ updatedOrder });
    } catch (error) {
      next(new Error("Unable to update order"));
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
  };

  public fetchOrdersByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;

      const orders = await this.orderService.fetchOrdersByUserId(userId);

      res.status(200).send(orders);
    } catch (error) {
      next(new Error("Unable to fetch orders"));
    }
  };

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
  };

  public fetchOrderByStoreId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { storeId } = req.params;

      const order = await this.orderService.fetchOrderByStoreId(storeId);

      if (!order) {
        throw new Error("Order not found");
      }

      res.status(200).send(order);
    } catch (error) {
      next(new Error("Unable to fetch order"));
    }
  };

  public deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { orderId } = req.params;

      await this.orderService.deleteOrder(orderId);

      res.status(204).send();
    } catch (error) {
      next(new Error("Unable to delete order"));
    }
  };
}

export default OrderController;

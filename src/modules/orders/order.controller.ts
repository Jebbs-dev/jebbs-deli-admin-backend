import { Request, Response, NextFunction } from "express";
import OrderService from "./order.service";
import HttpException from "@/utils/exceptions/http.exception";

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
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to create order"
        )
      );
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
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to update order"
        )
      );
    }
  };

  public fetchOrdersCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const orders = await this.orderService.fetchOrdersCount();

      res.status(200).send(orders);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch orders"
        )
      );
    }
  };

  public fetchOrdersCountByStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { storeid } = req.params;

      const orders = await this.orderService.fetchOrdersCountByStore(storeid);

      res.status(200).send(orders);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch orders"
        )
      );
    }
  };

  public fetchFilteredOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const query = req.query;
      const orders = await this.orderService.fetchFilteredOrders(query);
      res.status(200).send(orders);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch orders"
        )
      );
    }
  };

  public fetchFilteredOrdersByUserId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params;
      const query = req.query;

      const orders = await this.orderService.fetchFilteredOrdersByUserId(userId, query);

      res.status(200).send(orders);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch orders"
        )
      );
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
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch order"
        )
      );
    }
  };

  public fetchFilteredOrderByStoreId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { storeId } = req.params;
      const query = req.query;

      const order = await this.orderService.fetchFilteredOrderByStoreId(storeId, query);

      if (!order) {
        throw new Error("Order not found");
      }

      res.status(200).send(order);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch orders"
        )
      );
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
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to delete order"
        )
      );
    }
  };
}

export default OrderController;

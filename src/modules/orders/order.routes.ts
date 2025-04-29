import { Router } from "express";
import authenticated from "@/middlewares/auth/auth.middleware";
import OrderController from "./order.controller";
import RouteController from "@/utils/interfaces/route.controller.interface";

class OrderRouter implements RouteController {
  public path = "/orders";
  public router = Router();

  private orderController = new OrderController();

  constructor() {
    this.router.use(authenticated);
    this.initialiseRoutes();
  }

  initialiseRoutes() {
    this.router.post(this.path, this.orderController.createOrder);
    // this.router.get(`${this.path}`, this.orderController.fetchOrders);
    this.router.get(`${this.path}`, this.orderController.fetchFilteredOrders);
    this.router.get(`${this.path}/:userId`, this.orderController.fetchFilteredOrdersByUserId);
    this.router.get(`${this.path}/:id`, this.orderController.fetchSingleOrder);
    this.router.get(`${this.path}/store/:storeId`, this.orderController.fetchFilteredOrderByStoreId);
    this.router.put(`${this.path}/:id`, this.orderController.updateOrder);
    this.router.delete(`${this.path}/:id`, this.orderController.deleteOrder);
  }
}


export default OrderRouter;
import { Router } from 'express';
import authenticated from "@/middlewares/auth/auth.middleware";
import RouteController from '@/utils/interfaces/route.controller.interface';
import CartController from './cart.controller';

class CartRouter implements RouteController {
  public path = '/cart';
  public router = Router();

  private cartController = new CartController();

  constructor() {
    this.router.use(authenticated);
    this.initialiseRoutes();
  }

  initialiseRoutes() {
    this.router.post(this.path, this.cartController.addToCart);
    this.router.get(this.path, this.cartController.getCart);
    this.router.put(`${this.path}/:id`, this.cartController.updateCart);
    this.router.delete(`${this.path}/:id`, this.cartController.deleteCart);
  }

}

export default CartRouter;

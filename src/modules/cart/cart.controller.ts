import { NextFunction, Request, Response } from 'express';
import CartService from './cart.service';
import HttpException from '@/utils/exceptions/http.exception';

class CartController {
  private cartService = new CartService();

  public addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id; // Assuming you have user data in request from auth middleware
      const cartData = req.body;

      const cart = await this.cartService.addCartData(cartData, userId);
      res.status(201).json(cart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to add to cart"));
    }
  }

  public getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const cart = await this.cartService.fetchCartData(userId);
      res.status(200).json(cart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to fetch cart"));
    }
  }

  public updateCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cartId } = req.params;
      const { cartData, cartItems } = req.body;

      const updatedCart = await this.cartService.updateCartData(cartId, cartData, cartItems);
      res.status(200).json(updatedCart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to update cart"));
    }
  }

  public deleteCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cartId } = req.params;
      const result = await this.cartService.deleteCartData(cartId);
      res.status(200).json(result);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to delete cart"));
    }
  }
}

export default CartController;
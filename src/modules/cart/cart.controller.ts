import { NextFunction, Request, Response } from 'express';
import CartService from './cart.service';
import HttpException from '@/utils/exceptions/http.exception';

class CartController {
  private cartService = new CartService();

  public addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = req.user?.id; // Get user ID from auth middleware
      const sessionId = req.session.cartId; // Get session ID for guest carts
      
      // Get data from request body
      const { cartItems, totalPrice, userId: bodyUserId } = req.body;
      
      // Use authenticated user ID if available, otherwise use the ID from the request body
      const userId = authenticatedUserId || bodyUserId;

      // Make sure all cart items have a storeId
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          if (!item.storeId) {
            throw new Error('Each cart item must have a storeId');
          }
        }
      }

      // Prepare cart data with proper structure
      const cartData = {
        userId,
        sessionId: userId ? undefined : sessionId, // Only use sessionId if no userId
        totalPrice,
        cartItems
      };

      const cart = await this.cartService.addCartData(cartData);
      res.status(201).json(cart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to add to cart"));
    }
  }

  public getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params; // Get the userId from URL params
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const cart = await this.cartService.fetchCartData(userId);
      res.status(200).json(cart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to fetch cart"));
    }
  }

  public updateCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params; // Get cart ID from URL params
      const { cartData, cartItems } = req.body;

      // Make sure all cart items have a storeId
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          if (!item.storeId) {
            throw new Error('Each cart item must have a storeId');
          }
        }
      }

      const updatedCart = await this.cartService.updateCartData(id, cartData, cartItems);
      res.status(200).json(updatedCart);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to update cart"));
    }
  }

  public deleteCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params; // Get cart ID from URL params
      const result = await this.cartService.deleteCartData(id);
      res.status(200).json(result);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to delete cart"));
    }
  }
}

export default CartController;
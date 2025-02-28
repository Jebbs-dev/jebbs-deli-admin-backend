import { Cart, CartItem } from "@prisma/client";
import prisma from "@/utils/prisma";

class CartService {
  private prisma = prisma;

  public addCartData = async (cartData: Cart, userId: string) => {
    try {
      const newCart = await this.prisma.cart.upsert({
        where: { userId: userId },
        create: cartData,
        update: cartData,
        include: {
          cartItems: true,
          user: true,
        }
      });

      return newCart;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while adding to cart');
    }
  }

  public fetchCartData = async (userId: string) => {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: true
        }
      });

      if (!cart) {
        throw new Error('Cart not found');
      }

      return cart;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while fetching cart');
    }
  }

  public updateCartData = async (cartId: string, cartData: Partial<Cart>, cartItems?: CartItem[]) => {
    try {
      const updatedCart = await this.prisma.cart.update({
        where: { id: cartId },
        data: {
          ...cartData,
          cartItems: cartItems ? {
            deleteMany: {},
            create: cartItems
          } : undefined
        },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: true
        }
      });

      return updatedCart;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while updating cart');
    }
  }

  public deleteCartData = async (cartId: string) => {
    try {
      await this.prisma.cart.delete({
        where: { id: cartId }
      });

      return { message: 'Cart deleted successfully' };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while deleting cart');
    }
  }
}

export default CartService;
import { Cart, CartItem, CartStoreGroup } from "@prisma/client";
import prisma from "@/utils/prisma";

class CartService {
  private prisma = prisma;

  public addCartData = async (cartData: any) => {
    try {
      // Extract cartItems and store information from the incoming data
      const { cartItems, totalPrice, userId, sessionId } = cartData;
      
      // First, find or create a cart for the user or session
      let cart;
      
      if (userId) {
        // Check if the user already has a cart
        cart = await this.prisma.cart.findUnique({
          where: { userId },
          include: { cartGroups: true }
        });
        
        if (cart) {
          // Update the existing cart
          cart = await this.prisma.cart.update({
            where: { userId },
            data: { 
              totalPrice,
              updatedAt: new Date()
            },
            include: { cartGroups: true }
          });
        } else {
          // Create a new cart for the user
          cart = await this.prisma.cart.create({
            data: {
              userId,
              totalPrice,
            },
            include: { cartGroups: true }
          });
        }
      } else if (sessionId) {
        // Check if there's a cart for this session
        cart = await this.prisma.cart.findUnique({
          where: { sessionId },
          include: { cartGroups: true }
        });
        
        if (cart) {
          // Update the existing cart
          cart = await this.prisma.cart.update({
            where: { sessionId },
            data: { 
              totalPrice,
              updatedAt: new Date()
            },
            include: { cartGroups: true }
          });
        } else {
          // Create a new cart for the session
          cart = await this.prisma.cart.create({
            data: {
              sessionId,
              totalPrice,
            },
            include: { cartGroups: true }
          });
        }
      } else {
        throw new Error('Either userId or sessionId must be provided');
      }
      
      // Now, process the cart items if they exist
      if (cartItems && cartItems.length > 0) {
        // Group items by storeId
        const itemsByStore = this.groupItemsByStore(cartItems);
        
        // For each store group, create or update the store group and its items
        for (const [storeId, items] of Object.entries(itemsByStore)) {
          let cartStoreGroup = await this.prisma.cartStoreGroup.findFirst({
            where: {
              cartId: cart.id,
              storeId
            }
          });
          
          if (cartStoreGroup) {
            // Delete existing items for this store group
            await this.prisma.cartItem.deleteMany({
              where: { cartStoreGroupId: cartStoreGroup.id }
            });
            
            // Update the store group
            cartStoreGroup = await this.prisma.cartStoreGroup.update({
              where: { id: cartStoreGroup.id },
              data: {
                updatedAt: new Date()
              }
            });
          } else {
            // Create a new store group
            cartStoreGroup = await this.prisma.cartStoreGroup.create({
              data: {
                cartId: cart.id,
                storeId
              }
            });
          }
          
          // Add items to the store group
          for (const item of items) {
            await this.prisma.cartItem.create({
              data: {
                cartStoreGroupId: cartStoreGroup.id,
                productId: item.id,
                quantity: item.quantity || 1
              }
            });
          }
        }
      }
      
      // Return the cart with all related data
      return this.getCartWithDetails(cart.id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while adding to cart');
    }
  }

  public fetchCartData = async (userId: string) => {
    try {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          cartGroups: {
            include: {
              store: true,
              cartItems: {
                include: {
                  product: true
                }
              }
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

  public updateCartData = async (cartId: string, cartData: Partial<Cart>, cartItems?: any[]) => {
    try {
      // Update the basic cart data
      await this.prisma.cart.update({
        where: { id: cartId },
        data: {
          ...cartData,
          updatedAt: new Date()
        }
      });
      
      // If cartItems is an empty array or undefined, delete all CartStoreGroup entries
      if (!cartItems || cartItems.length === 0) {
        // First delete all cart items
        const cartStoreGroups = await this.prisma.cartStoreGroup.findMany({
          where: { cartId }
        });
        
        for (const group of cartStoreGroups) {
          await this.prisma.cartItem.deleteMany({
            where: { cartStoreGroupId: group.id }
          });
        }
        
        // Then delete all cart store groups
        await this.prisma.cartStoreGroup.deleteMany({
          where: { cartId }
        });
        
        return this.getCartWithDetails(cartId);
      }
      
      // If we have cart items, process them
      if (cartItems && cartItems.length > 0) {
        // Get all existing store groups for this cart
        const existingGroups = await this.prisma.cartStoreGroup.findMany({
          where: { cartId }
        });
        
        // Group items by storeId
        const itemsByStore = this.groupItemsByStore(cartItems);
        const updatedStoreIds = Object.keys(itemsByStore);
        
        // Delete any store groups that aren't in the updated data
        for (const group of existingGroups) {
          if (!updatedStoreIds.includes(group.storeId)) {
            // Delete all items for this store group
            await this.prisma.cartItem.deleteMany({
              where: { cartStoreGroupId: group.id }
            });
            
            // Delete the store group
            await this.prisma.cartStoreGroup.delete({
              where: { id: group.id }
            });
          }
        }
        
        // For each store group in updated data, create or update it
        for (const [storeId, items] of Object.entries(itemsByStore)) {
          // Skip if no items for this store
          if (items.length === 0) continue;
          
          let cartStoreGroup = await this.prisma.cartStoreGroup.findFirst({
            where: {
              cartId,
              storeId
            }
          });
          
          if (cartStoreGroup) {
            // Delete existing items for this store group
            await this.prisma.cartItem.deleteMany({
              where: { cartStoreGroupId: cartStoreGroup.id }
            });
            
            // Update the store group
            cartStoreGroup = await this.prisma.cartStoreGroup.update({
              where: { id: cartStoreGroup.id },
              data: {
                updatedAt: new Date()
              }
            });
          } else {
            // Create a new store group
            cartStoreGroup = await this.prisma.cartStoreGroup.create({
              data: {
                cartId,
                storeId
              }
            });
          }
          
          // Add items to the store group
          for (const item of items) {
            await this.prisma.cartItem.create({
              data: {
                cartStoreGroupId: cartStoreGroup.id,
                productId: item.id,
                quantity: item.quantity || 1
              }
            });
          }
        }
      }
      
      // Return the updated cart with all related data
      return this.getCartWithDetails(cartId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while updating cart');
    }
  }

  public deleteCartData = async (cartId: string) => {
    try {
      // Find all store groups for this cart
      const cartStoreGroups = await this.prisma.cartStoreGroup.findMany({
        where: { cartId }
      });
      
      // Delete all cart items for each store group
      for (const group of cartStoreGroups) {
        await this.prisma.cartItem.deleteMany({
          where: { cartStoreGroupId: group.id }
        });
      }
      
      // Delete all store groups
      await this.prisma.cartStoreGroup.deleteMany({
        where: { cartId }
      });
      
      // Delete the cart
      await this.prisma.cart.delete({
        where: { id: cartId }
      });

      return { message: 'Cart deleted successfully' };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'An error occurred while deleting cart');
    }
  }
  
  // Helper method to group cart items by store
  private groupItemsByStore(cartItems: any[]): Record<string, any[]> {
    const itemsByStore: Record<string, any[]> = {};
    
    for (const item of cartItems) {
      if (!item.storeId) {
        throw new Error('Store ID is required for each cart item');
      }
      
      if (!itemsByStore[item.storeId]) {
        itemsByStore[item.storeId] = [];
      }
      
      itemsByStore[item.storeId].push(item);
    }
    
    return itemsByStore;
  }
  
  // Helper method to get a cart with all its details
  private async getCartWithDetails(cartId: string) {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        cartGroups: {
          include: {
            store: true,
            cartItems: {
              include: {
                product: true
              }
            }
          }
        },
        user: true
      }
    });
  }
}

export default CartService;
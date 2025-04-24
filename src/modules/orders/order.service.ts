import prisma from "@/utils/prisma";
import { Order, OrderItem } from "@prisma/client";

class OrderService {
  private prisma = prisma;

  public createOrder = async (order: Order, orderItems: OrderItem[]) => {
    try {
      const newOrder = await this.prisma.order.create({
        data: {
          ...order,
          orderItems: {
            create: orderItems.map((item) => ({
              ...item,
              orderId: undefined, // Ensure orderId is not set here
            })),
          },
        },
      });

      // Update orderItems with the new orderId
      await this.prisma.orderItem.updateMany({
        where: { orderId: "" }, // Assuming orderId is initially empty
        data: { orderId: newOrder.id },
      });

      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error); // Log the error for debugging
      throw new Error("Unable to create order");
    }
  };

  public updateOrder = async (
    orderId: string,
    orderData: Partial<Order>,
    orderItems: OrderItem[]
  ) => {
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          ...orderData,
          orderItems: {
            deleteMany: {}, // Deletes existing order items
            create: orderItems, // Creates new order items
          },
        },
      });

      return updatedOrder;
    } catch (error) {
      throw new Error("Unable to update order");
    }
  };

  public deleteOrder = async (orderId: string) => {
    try {
      await this.prisma.order.delete({
        where: { id: orderId },
      });
    } catch (error) {
      throw new Error("Unable to delete order");
    }
  };

  public fetchOrders = async () => {
    try {
      const orders = await this.prisma.order.findMany({
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders;
    } catch (error) {
      throw new Error("Unable to fetch orders");
    }
  };

  public fetchOrdersByUserId = async (userId: string) => {
    try {
      const orders = await this.prisma.order.findMany({
        where: { userId: userId },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders;
    } catch (error) {
      throw new Error("Unable to fetch orders");
    }
  };

  public fetchSingleOrder = async (orderId: string) => {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true,
        },
      });

      return order;
    } catch (error) {
      throw new Error("Unable to fetch order");
    }
  };

  public fetchOrderByStoreId = async (storeId: string) => {
    try {
      const order = await this.prisma.order.findMany({
        where: { storeId: storeId },
        include: {
          orderItems: true,
        },
      });

      return order;
    } catch (error) {
      throw new Error("Unable to fetch order");
    }
  };
}

export default OrderService;

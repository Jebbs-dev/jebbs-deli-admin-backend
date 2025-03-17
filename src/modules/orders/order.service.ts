import prisma from "@/utils/prisma";
import { Order } from "@prisma/client";

class OrderService {
  private prisma = prisma;

  public createOrder = async (order: Order) => {
    try {
      const newOrder = await this.prisma.order.create({
        data: order,
      });

      return newOrder;
    } catch (error) {
      throw new Error("Unable to create order");
    }
  }

  public fetchOrders = async () => {
    try {
      const orders = await this.prisma.order.findMany({
        include: {
          orderItems: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders;
    } catch (error) {
      throw new Error("Unable to fetch orders");
    }
  }

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
  }
}

export default OrderService;
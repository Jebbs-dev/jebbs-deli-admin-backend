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
      throw new Error(
        error instanceof Error ? error.message : "Unable to create order"
      );
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
      throw new Error(
        error instanceof Error ? error.message : "Unable to update order"
      );
    }
  };

  public deleteOrder = async (orderId: string) => {
    try {
      await this.prisma.order.delete({
        where: { id: orderId },
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete order"
      );
    }
  };

  public fetchOrdersCount = async () => {
    try {
      const [orders, totalOrders] = await prisma.$transaction([
        prisma.order.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            orderItems: {
              include: {
                product: true,
                store: true,
              },
            },
          },
        }),
        prisma.order.count({}),
      ]);

      return {
        orders,
        totalOrders,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch orders"
      );
    }
  };

  public fetchOrdersCountByStore = async (storeId: string) => {
    try {
      const totalOrders = await prisma.order.count({
        where: {
          storeId,
        },
      });

      return {
        totalOrders,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch orders"
      );
    }
  };

  public fetchFilteredOrders = async (filters?: any) => {
    const {
      search,
      offset,
      storeId,
      userId,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters;

    try {
      const whereClause: any = {};

      if (userId) whereClause.userId = userId;
      if (storeId) whereClause.storeId = storeId;
      if (search) {
        const searchTerm = search.toLowerCase();

        const findStatus = this.getOrderEnum(searchTerm);

        whereClause.OR = [
          // { name: { contains: search, mode: "insensitive" } },
          ...(findStatus ? [{ status: findStatus }] : []),
        ];
      }

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            user: true,
            orderItems: {
              include: {
                product: true,
                store: true,
              },
            },
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      return {
        orders,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch orders"
      );
    }
  };

  public fetchFilteredOrdersByUserId = async (
    userId: string,
    filters?: any
  ) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters;

    try {
      const whereClause: any = {
        userId,
      };

      if (search) {
        const searchTerm = search.toLowerCase();

        const findStatus = this.getOrderEnum(searchTerm);

        whereClause.OR = [
          // { name: { contains: search, mode: "insensitive" } },
          ...(findStatus ? [{ status: findStatus }] : []),
        ];
      }

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            user: true,
            orderItems: {
              include: {
                product: true,
                store: true,
              },
            },
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      return {
        orders,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch orders"
      );
    }
  };

  public fetchSingleOrder = async (orderId: string) => {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
              store: true,
            },
          },
        },
      });

      return order;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch order"
      );
    }
  };

  public fetchFilteredOrderByStoreId = async (
    storeId: string,
    filters?: any
  ) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters;

    try {
      const whereClause: any = {
        storeId,
      };

      if (search) {
        const searchTerm = search.toLowerCase();

        const findStatus = this.getOrderEnum(searchTerm);

        whereClause.OR = [
          // { name: { contains: search, mode: "insensitive" } },
          ...(findStatus ? [{ status: findStatus }] : []),
        ];
      }

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [orders, total] = await prisma.$transaction([
        prisma.order.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            user: true,
            orderItems: {
              include: {
                product: true,
                store: true,
              },
            },
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      return {
        orders,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch orders"
      );
    }
  };

  public getOrderEnum = (searchTerm: string) => {
    const orderStatuses = ["pending", "delivered", "cancelled"];

    const matched = orderStatuses.find((c) => c.toLowerCase() === searchTerm);
    return matched ?? null;
  };
}

export default OrderService;

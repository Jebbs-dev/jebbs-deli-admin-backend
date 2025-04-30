import prisma from "@/utils/prisma";
import { Address, User } from "@prisma/client";
import cloudinary from "@/config/cloudinary";

class UserService {
  private prisma = prisma;

  /**
   * Create a user
   */

  public createUser = async (
    userDetails: User,
    imageFile?: Express.Multer.File
  ) => {
    try {
      if (!userDetails.password) {
        throw new Error("Password is required");
      }

      let avatarUrl;
      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "users",
          }
        );
        avatarUrl = uploadResponse.secure_url;
      }

      const newUser = await this.prisma.user.create({
        data: {
          ...userDetails,
          avatar: avatarUrl || null,
        },
      });

      return newUser;
    } catch (error) {
      console.error("Error in UserService.createUser:", error);
      throw new Error(
        error instanceof Error ? error.message : "Unable to create user"
      );
    }
  };

  /**
   * Create an admin
   */

  public createAdminUser = async (
    userDetails: User,
    imageFile?: Express.Multer.File
  ) => {
    try {
      if (!userDetails.password) {
        throw new Error("Password is required");
      }

      let avatarUrl;
      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "users",
          }
        );
        avatarUrl = uploadResponse.secure_url;
      }

      const newUser = await this.prisma.user.create({
        data: {
          ...userDetails,
          role: "ADMIN",
          avatar: avatarUrl || null,
        },
      });
      return newUser;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to create admin user"
      );
    }
  };

  /**
   * Create a vendor admin
   */

  public createVendorAdmin = async (
    userDetails: User,
    imageFile?: Express.Multer.File
  ) => {
    try {
      if (!userDetails.password) {
        throw new Error("Password is required");
      }

      let avatarUrl;
      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "users",
          }
        );
        avatarUrl = uploadResponse.secure_url;
      }

      const newUser = await this.prisma.user.create({
        data: {
          ...userDetails,
          role: "VENDOR",
          avatar: avatarUrl || null,
        },
      });
      return newUser;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to create vendor admin"
      );
    }
  };

  /**
   * Fetch all users
   */

  public fetchUsers = async () => {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      return users;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch users"
      );
    }
  };

  /**
   * Fetch all customers
   */
  public fetchFilteredCustomers = async (filters?: any) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters || {};

    try {
      const whereClause: any = {
        role: "USER",
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
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

      const [customers, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            store: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      return {
        customers,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch users"
      );
    }
  };

  /**
   * Fetch a user by Id
   */

  public fetchUserById = async (userId: string) => {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      return user;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch user"
      );
    }
  };

  /**
   * Fetch all admins
   */

  public fetchFilteredAdmins = async (filters?: any) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters || {};

    try {
      const whereClause: any = {
        role: "ADMIN",
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
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

      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            store: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      return {
        users,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch admins"
      );
    }
  };

  /**
   * Fetch all vendor admins
   */

  public fetchFilteredVendorAdmins = async (filters?: any) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters || {};

    try {
      const whereClause: any = {
        role: "VENDOR",
      };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
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

      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            store: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      return {
        users,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch vendor admins"
      );
    }
  };

  fetchVendorAdminById = async (userId: string) => {
    try {
      const vendorAdmin = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          store: {
            include: {
              products: true,
            },
          },
        },
      });

      return vendorAdmin;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch vendor admin"
      );
    }
  };

  /**
   * Update a user
   */

  public updateUser = async (
    userId: string,
    userData: Partial<User>,
    storeData?: any,
    imageFile?: Express.Multer.File
  ) => {
    try {
      let imageUrl = undefined;

      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "users",
          }
        );
        imageUrl = uploadResponse.secure_url;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...userData,
          ...(imageUrl && { avatar: imageUrl }),
          ...(storeData && {
            store: {
              upsert: {
                create: storeData,
                update: storeData,
              },
            },
          }),
        },
      });

      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Unable to update user"
      );
    }
  };

  /**
   * Delete a user
   */

  public deleteUser = async (userId: string) => {
    try {
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return true;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete user"
      );
    }
  };

  public addAddress = async (addressData: Address) => {
    try {
      await this.prisma.address.create({
        data: addressData,
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete user"
      );
    }
  };
}

export default UserService;

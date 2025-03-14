import prisma from "@/utils/prisma";
import { User } from "@prisma/client";
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

  public fetchAdmins = async () => {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: "ADMIN" },
        orderBy: {
          createdAt: "desc",
        },
      });

      return admins;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch admins"
      );
    }
  };

  /**
   * Fetch all vendor admins
   */

  public fetchVendorAdmins = async () => {
    try {
      const vendorAdmins = await this.prisma.user.findMany({
        where: { role: "VENDOR" },
        orderBy: {
          createdAt: "desc",
        },
      });

      return vendorAdmins;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch vendor admins"
      );
    }
  };

  /**
   * Update a user
   */

  public updateUser = async (
    userId: string,
    userData: Partial<User>,
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
        data: { ...userData, ...(imageUrl && { avatar: imageUrl }) },
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
}

export default UserService;

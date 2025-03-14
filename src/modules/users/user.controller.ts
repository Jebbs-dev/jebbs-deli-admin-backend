import UserService from "./user.service";
import { Request, Response, NextFunction } from "express";
import HttpException from "@/utils/exceptions/http.exception";
import { hashPassword } from "@/utils/helpers/helpers.password";
import token from "@/utils/token";
import { User } from "@prisma/client";

class UserController {
  private userService = new UserService();

  /**
   * Create a user
   */

  public createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userData } = req.body;
      const imageFile = req.file;

      const password = hashPassword(userData.password);

      const user = await this.userService.createUser(
        { ...userData, password },
        imageFile
      );

      res.status(201).json({ user });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Cannot create user"
        )
      );
    }
  };

  /**
   * Create an admin
   */

  public createAdminUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userData } = req.body;
      const imageFile = req.file;

      const password = hashPassword(userData.password);

      const user = await this.userService.createAdminUser(
        { ...userData, password },
        imageFile
      );

      res.status(201).json({ user });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Cannot create admin user"
        )
      );
    }
  };

  /**
   * Create a vendor admin
   */

  public createVendorAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userData } = req.body;
      const imageFile = req.file;

      const password = hashPassword(userData.password);

      const user = await this.userService.createVendorAdmin(
        { ...userData, password },
        imageFile
      );

      res.status(201).json({ user });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to create vendor admin"
        )
      );
    }
  };

  /**
   * Fetch all users
   */

  public fetchUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const users = await this.userService.fetchUsers();

      res.status(200).send(users);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch users"
        )
      );
    }
  };

  /**
   * Fetch a user by Id
   */

  public fetchUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const user = await this.userService.fetchUserById(id);

      res.status(200).send(user);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch user"
        )
      );
    }
  };

  /**
   * Fetch all admins
   */

  public fetchAdmins = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const admins = await this.userService.fetchAdmins();

      res.status(200).send(admins);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch admins"
        )
      );
    }
  };

  /**
   * Fetch all vendor admins
   */

  public fetchVendorAdmins = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const vendorAdmins = await this.userService.fetchVendorAdmins();

      res.status(200).send(vendorAdmins);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch vendor admins"
        )
      );
    }
  };

  /**
   * Update a user
   */

  public updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const imageFile = req.file;

      const updatedUser = await this.userService.updateUser(
        id,
        userData,
        imageFile
      );
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to update user"
        )
      );
    }
  };

  /**
   * Delete a user
   */

  public deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      await this.userService.deleteUser(id);

      res.status(204).send("User deleted successfully");
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to delete user"
        )
      );
    }
  };
}

export default UserController;

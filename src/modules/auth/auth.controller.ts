import { Request, Response, NextFunction } from "express";
import HttpException from "@/utils/exceptions/http.exception";
import AuthService from "./auth.service";
import prisma from "@/utils/prisma";

class AuthController {
  private authService = new AuthService();
  private prisma = prisma;

  /**
   * User login
   */
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new HttpException(400, "Email and password are required");
      }
      const tokens = await this.authService.login(email, password);

      const userData = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (userData) {
        if (userData.role === "USER" && req.session.cartId) {
          const guestCart = await prisma.cart.findUnique({
            where: { sessionId: req.session.cartId },
            include: { cartGroups: true },
          });

          if (guestCart) {
            await prisma.cart.update({
              where: { id: guestCart.id },
              data: { userId: userData.id, sessionId: null },
            });
          }
        }

        req.session.userId = userData.id;
      }

      const userInfo = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userData,
      };

      res.status(200).json(userInfo);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Unable to login user"
        )
      );
    }
  };

  public adminLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new HttpException(400, "Email and password are required");
      }
      const tokens = await this.authService.adminLogin(email, password);

      const userData = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      const userInfo = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userData,
      };

      res.status(200).json(userInfo);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Unable to login vendor"
        )
      );
    }
  };

  public vendorLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new HttpException(400, "Email and password are required");
      }
      const tokens = await this.authService.vendorLogin(email, password);

      const userData = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          store: true,
        },
      });

      const userInfo = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userData,
      };

      res.status(200).json(userInfo);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Unable to login vendor"
        )
      );
    }
  };

  /**
   * User logout
   */
  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    // Logic for logging out the user (e.g., invalidating tokens) can be added here
    res.sendStatus(204); // Send a 204 No Content status for successful logout
  };

  /**
   * Refresh access token using refresh token
   */
  // public refresh = async (req: Request, res: Response, next: NextFunction) => {
  //   const { refreshToken } = req.body;

  //   if (!refreshToken) {
  //     return next(new HttpException(401, "No refresh token provided"));
  //   }

  //   try {
  //     const tokens = await this.authService.refresh(refreshToken);

  //     res.status(200).json({
  //       accessToken: tokens.accessToken,
  //       refreshToken: tokens.refreshToken
  //     });
  //   } catch (error) {
  //     next(
  //       new HttpException(
  //         403,
  //         error instanceof Error ? error.message : "Invalid or expired refresh token"
  //       )
  //     );
  //   }
  // };

  public refresh = async (req: Request, res: Response, next: NextFunction) => {
    // console.log("Refresh token request received:", req.body); // Debugging
    const { refreshToken } = req.body;

    if (!refreshToken) {
      console.log("No refresh token provided");
      return next(new HttpException(401, "No refresh token provided"));
    }

    try {
      const tokens = await this.authService.refresh(refreshToken);
      // console.log("New tokens generated:", tokens); // Debugging

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      // console.error("Error refreshing token:", error); // Debugging
      next(
        new HttpException(
          403,
          error instanceof Error
            ? error.message
            : "Invalid or expired refresh token"
        )
      );
    }
  };
}

export default AuthController;

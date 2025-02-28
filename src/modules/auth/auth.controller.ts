import HttpException from "@/utils/exceptions/http.exception";
import AuthService from "./auth.service";
import { Request, Response, NextFunction } from "express";
import { User } from "@prisma/client";
import prisma from "@/utils/prisma";

// interface ExtendedRequest extends Request {
//   user: User;
//   userId?: string;
// }

class AuthController {
  private authService = new AuthService();
  private prisma = prisma;

  public login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.role === "USER") {
        if (req.session.cartId) {
          const guestCart = await prisma.cart.findUnique({
            where: { sessionId: req.session.cartId },
            include: { cartItems: true },
          });

          if (guestCart) {
            await prisma.cart.update({
              where: { id: guestCart.id },
              data: { userId: user.id, sessionId: null }, // Assign cart to user
            });
          }
        }
      }
    }

    try {
      const tokens = await this.authService.login(email, password);

      const userInfo = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true },
      });

      if (user) {
        req.session.userId = user.id;
      }

      const loginInfo = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userInfo,
      };

      res.json(loginInfo);
    } catch (error) {
      next(new HttpException(500, error ? (error as Error).message : "Failed to login"));
    }
  };

  public logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error(err);
        }
      });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to logout"
        )
      );
    }
  };
}

export default AuthController;

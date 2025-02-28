import { comparePassword } from "@/utils/helpers/helpers.password";
import prisma from "@/utils/prisma";
import token from "@/utils/token";
import { User } from "@prisma/client";

class AuthService {
  private prisma = prisma;

  public login = async (email: string, password: string) => {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (comparePassword(password, user.password)) {
        return token.createToken(user as User);
      } else {
        throw new Error("Wrong password!");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to login user"
      );
    }
  };
  
  public logout = async (userId: string) => {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      await this.prisma.token.deleteMany({
        where: {
          userId: user.id,
        },
      });

      return true;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to logout user"
      );
    }
  };
}

export default AuthService;

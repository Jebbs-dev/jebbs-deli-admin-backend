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

  public refresh = async (refreshToken: string) => {
    try {
      // Verify the refresh token
      const payload = await token.verifyToken(refreshToken);
      
      if (!payload || !payload.id) {
        throw new Error("Invalid refresh token");
      }

      // Check if token exists in database
      const tokenRecord = await this.prisma.token.findFirst({
        where: { token: refreshToken },
      });

      if (!tokenRecord) {
        throw new Error("Refresh token not found");
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id as string },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate new access token
      const accessToken = await token.createToken(user);
      
      // // Revoke old refresh token
      // await token.revokeRefreshToken(refreshToken);
      
      return accessToken;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to refresh token"
      );
    }
  };
}

export default AuthService;

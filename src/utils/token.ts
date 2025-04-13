import { PrismaClient, User, Token } from "@prisma/client";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const createToken = async (user: User) => {
  const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  // Store refresh token in database
  await prisma.token.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    },
  });

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): Promise<JwtPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, payload) => {
      if (err) return reject(err);
      resolve(payload as JwtPayload);
    });
  });
};

export const revokeRefreshToken = async (refreshToken: string) => {
  await prisma.token.deleteMany({
    where: { token: refreshToken },
  });
};

export default { createToken, verifyToken, revokeRefreshToken };

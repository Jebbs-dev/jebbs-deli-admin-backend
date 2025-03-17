import HttpException from "@/utils/exceptions/http.exception";
import { Token, User } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import token from "@/utils/token";
import prisma from "@/utils/prisma";


async function authenticatedMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bearer = req.headers['authorization'];

  if (!bearer || !bearer.startsWith("Bearer ")) {
    return next(new HttpException(401, "Unauthorised"));
  }

  const accessToken = bearer.split("Bearer ")[1].trim();

  try {
    const payload = await token.verifyToken(accessToken);

    if (payload instanceof jwt.JsonWebTokenError) {
      return next(new HttpException(401, 'Unauthorised'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });

    console.log(user);

    if (!user) {
      return next(new HttpException(401, 'Unauthorised'));
    }


    req.user = user;
    
    return next();

  } catch (error) {
    return next(new HttpException(401, 'Unauthorised'));
  }
}

export default authenticatedMiddleware;

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    cartId: string;
    userId?: string;
  }
}

declare global {
  namespace Express {
    export interface Request {
      user: User
    }
  }
}
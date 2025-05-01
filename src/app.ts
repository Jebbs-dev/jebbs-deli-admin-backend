import express, { Application, urlencoded } from "express";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import crypto from "crypto";

import errorMiddleware from "@/middlewares/error/error.middleware";
import RouteController from "@/utils/interfaces/route.controller.interface";
import session from "express-session";

import { Request, Response, NextFunction } from "express";

class App {
  public express: Application;
  public port: number;

  public allowedOrigins = [
    "http://localhost:3000", // dev
    "https://jebbs-deli.vercel.app/", // staging
  ];

  constructor(routers: RouteController[], port: number) {
    this.express = express();
    this.port = port;

    this.initialiseDatabaseConnection();
    this.initialiseMiddleware();
    this.initialiseRouters(routers);
    this.initialiseErrorHandling();
    this.handleCartSession();
  }

  private initialiseMiddleware(): void {
    this.express.use(helmet());
    this.express.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || this.allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );
    this.express.options("*", cors());

    this.express.use(morgan("dev"));
    this.express.use(express.json());
    this.express.use(urlencoded({ extended: false }));
    this.express.use(compression());

    // Initialize session middleware
    this.express.use(
      session({
        secret: process.env.SESSION_SECRET || "cart-session-secret",
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure: process.env.NODE_ENV === "production",
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      })
    );
  }

  private initialiseRouters(routers: RouteController[]): void {
    routers.forEach((controller: RouteController) => {
      this.express.use("/api", controller.router);
    });
  }

  private initialiseErrorHandling(): void {
    this.express.use(errorMiddleware);
  }

  private initialiseDatabaseConnection(): void {
    // Connect to your database here
  }

  private handleCartSession(): void {
    this.express.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.session.cartId) {
        req.session.cartId = crypto.randomUUID();
      }
      next();
    });
  }

  public listen(): void {
    this.express.listen(this.port, () => {
      console.log(`App listening on port ${this.port}`);
    });
  }
}

export default App;

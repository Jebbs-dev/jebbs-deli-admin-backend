import express, { Application, urlencoded } from "express";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import errorMiddleware from "@/middlewares/error/error.middleware";
import RouteController from "@/utils/interfaces/route.controller.interface";
import session from "express-session";

import { Request, Response, NextFunction } from "express";


class App {
  public express: Application;
  public port: number;

  public corsOptions = {
    origin: "http://localhost:3000",
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
  };

  constructor(routers: RouteController[], port: number) {
    this.express = express();
    this.port = port;

    this.initialiseDatabaseConnection();
    this.initialiseMiddleware();
    this.initialiseRouters(routers);
    this.initialiseErrorHandling();
    // this.handleCartSession();
  }



  private initialiseMiddleware(): void {
    this.express.use(helmet());
    this.express.use(cors(this.corsOptions));
    this.express.options("*", cors());

    this.express.use(morgan("dev"));
    this.express.use(express.json());
    this.express.use(urlencoded({ extended: false }));
    this.express.use(compression());
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
    // Implement session management for shopping cart
    session({
      secret: 'cart-session',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // Set to true in production
    })

    this.express.use((req: Request,
      res: Response,
      next: NextFunction) => {
      if (!req.session.cartId) {
        req.session.cartId = crypto.randomUUID(); // Generate a unique cart session ID
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

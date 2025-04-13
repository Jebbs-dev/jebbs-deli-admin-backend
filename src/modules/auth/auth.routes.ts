import RouteController from "@/utils/interfaces/route.controller.interface";
import { Router } from "express";
import AuthController from "./auth.controller";
import authenticated from "@/middlewares/auth/auth.middleware";


class AuthRouter implements RouteController {
  public path = "/auth";
  public router = Router();
  private authController = new AuthController();

  constructor() {
    this.initialiseRoutes();
  }

  private initialiseRoutes(): void {
    this.router.post(`${this.path}/login`, this.authController.login);
    this.router.post(`${this.path}/login/admin`, this.authController.adminLogin);
    this.router.post(`${this.path}/login/vendor`, this.authController.vendorLogin);
    this.router.post(`${this.path}/logout`, authenticated, this.authController.logout);
    this.router.post(`${this.path}/refresh`, this.authController.refresh);
  }
}

export default AuthRouter;

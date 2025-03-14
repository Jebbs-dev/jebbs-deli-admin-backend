import RouteController from "@/utils/interfaces/route.controller.interface";
import { Router } from "express";
import VendorController from "./vendor.controller";
import authenticated from "@/middlewares/auth/auth.middleware";
import upload from "@/middlewares/upload/upload.middleware";


class VendorRouter implements RouteController {
  public path = "/vendors";
  public router: Router = Router();
  private vendorController = new VendorController();
  
  constructor() {
    this.initialiseRoutes();
  }

  public initialiseRoutes(): void {
    this.router.post(`${this.path}/register`, authenticated, upload("vendors").single("logo"), this.vendorController.registerVendor); //http://localhost:8080/api/vendors/register
    this.router.get(this.path, this.vendorController.fetchVendors);
    this.router.get(`${this.path}/:id`, this.vendorController.fetchSingleVendor);
    this.router.patch(`${this.path}/:id`, authenticated, upload("vendors").single("logo"), this.vendorController.updateVendor);
    this.router.delete(`${this.path}/:id`, authenticated, this.vendorController.deleteVendor);
  }
}

export default VendorRouter;
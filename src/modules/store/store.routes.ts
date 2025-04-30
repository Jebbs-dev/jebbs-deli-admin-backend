import RouteController from "@/utils/interfaces/route.controller.interface";
import { Router } from "express";
import VendorController from "./store.controller";
import authenticated from "@/middlewares/auth/auth.middleware";
import upload from "@/middlewares/upload/upload.middleware";

class VendorRouter implements RouteController {
  public path = "/store";
  public router: Router = Router();
  private storeController = new VendorController();

  constructor() {
    this.initialiseRoutes();
  }

  public initialiseRoutes(): void {
    this.router.post(
      `${this.path}/register`,
      authenticated,
      upload("store").single("logo"),
      this.storeController.registerStore
    ); //http://localhost:8080/api/Store/register
    this.router.get(this.path, this.storeController.fetchFilteredStores);
    this.router.get(`${this.path}/:id`, this.storeController.fetchSingleStore);
    this.router.get(
      `${this.path}/:id`,
      authenticated,
      this.storeController.fetchStoreByVendorId
    );
    this.router.patch(
      `${this.path}/:id`,
      authenticated,
      upload("Store").fields([
        { name: "billboard", maxCount: 1 },
        { name: "logo", maxCount: 1 },
      ]),
      this.storeController.updateStore
    );
    this.router.delete(
      `${this.path}/:id`,
      authenticated,
      this.storeController.deleteStore
    );
  }
}

export default VendorRouter;

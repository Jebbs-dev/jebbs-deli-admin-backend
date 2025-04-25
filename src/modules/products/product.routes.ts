import RouteController from "@/utils/interfaces/route.controller.interface";
import { Router } from "express";
import ProductController from "./product.controller";
import authenticated from "@/middlewares/auth/auth.middleware";
import upload from "@/middlewares/upload/upload.middleware";

class ProductRouter implements RouteController {
  public path = "/products";
  public router: Router = Router();

  private productController = new ProductController();

  constructor() {
    this.initialiseRoutes();
  }

  initialiseRoutes() {
    this.router.post(
      this.path,
      authenticated,
      upload("products").single("image"),
      this.productController.addProduct
    );
    // this.router.get(
    //   this.path,
    //   // authenticated,
    //   this.productController.fetchProducts
    // );
    this.router.get(
      `${this.path}`,
      // authenticated,
      this.productController.fetchFilteredProduct
    );
    this.router.get(
      `${this.path}/store/:storeId`,
      // authenticated,
      this.productController.fetchProductsByStore
    );
    this.router.get(
      `${this.path}/:id/store/:storeId`,
      // authenticated,
      this.productController.fetchSingleProductByStore
    );
    this.router.get(
      `${this.path}/:id`,
      // authenticated,
      this.productController.fetchSingleProduct
    );
    this.router.patch(
      `${this.path}/:id`,
      upload("products").single("image"),
      authenticated,
      this.productController.updateProduct
    );
    this.router.delete(
      `${this.path}/:id`,
      authenticated,
      this.productController.deleteProduct
    );
  }
}

export default ProductRouter;

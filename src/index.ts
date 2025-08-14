import "./registerAlias";
import "dotenv/config";
import validateEnv from "@/utils/validateEnv";
import App from "./app";
import AuthRouter from "@/modules/auth/auth.routes";
import StoreRouter from "@/modules/store/store.routes";
import ProductRouter from "@/modules/products/product.routes";
import UserRouter from "@/modules/users/user.routes";
import CartRouter from "./modules/cart/cart.routes";
import OrderRouter from "./modules/orders/order.routes";
import PaymentRouter from "./modules/payment/payment.routes";

try {
  validateEnv();

  const port = Number(process.env.PORT) || 8080;
  const app = new App(
    [
      new StoreRouter(),
      new ProductRouter(),
      new UserRouter(),
      new AuthRouter(),
      new CartRouter(),
      new OrderRouter(),
      new PaymentRouter(),
    ],
    port
  );

  app.listen();
} catch (error) {
  console.error("Error starting the server:", error);
  process.exit(1);
}

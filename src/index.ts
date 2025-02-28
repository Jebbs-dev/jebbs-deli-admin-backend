import './registerAlias';
import "dotenv/config";
import validateEnv from "@/utils/validateEnv";
import App from "./app";
import AuthRouter from '@/modules/auth/auth.routes';
import VendorRouter from '@/modules/vendors/vendor.routes';
import ProductRouter from '@/modules/products/product.routes';
import UserRouter from '@/modules/users/user.routes';

try {
  validateEnv();
  
  const port = Number(process.env.PORT) || 8080;
  const app = new App(
    [new VendorRouter(), new ProductRouter(), new UserRouter(), new AuthRouter()], // Your route controllers will go here
    port
  );

  app.listen();
} catch (error) {
  console.error('Error starting the server:', error);
  process.exit(1);
}
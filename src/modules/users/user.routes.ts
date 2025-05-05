import RouteController from "@/utils/interfaces/route.controller.interface";
import { Router } from "express";
import UserController from "./user.controller";
import authenticated from "@/middlewares/auth/auth.middleware";
import upload from "@/middlewares/upload/upload.middleware";

class UserRouter implements RouteController {
  public path = "/users";
  public customerPath = "/customers";
  public adminPath = "/admin";
  public router: Router = Router();
  private userController = new UserController();

  constructor() {
    this.initialiseRoutes();
  }

  initialiseRoutes() {
    this.router.post(`${this.path}/register`, this.userController.createUser);
    this.router.post(`${this.adminPath}/register`, upload("users").single("avatar"), this.userController.createAdminUser);
    this.router.post(`${this.adminPath}/vendor/register`, upload("users").single("avatar"), this.userController.createVendorAdmin);
    this.router.post(`${this.path}/address`, authenticated,  this.userController.addAddress);
    // this.router.get(this.path, authenticated, this.userController.fetchUsers);
    this.router.get(`${this.customerPath}/count`, authenticated, this.userController.fetchCustomerCount);
    this.router.get(this.customerPath, authenticated, this.userController.fetchCustomers);
    this.router.get(`${this.path}/:id`, authenticated, this.userController.fetchUserById);
    this.router.get(`${this.path}/admins`, authenticated, this.userController.fetchAdmins);
    this.router.get(`${this.path}/admins/vendors`, authenticated, this.userController.fetchVendorAdmins);
    this.router.get(`${this.path}/vendor/:id`, authenticated, this.userController.fetchVendorAdminById);
    this.router.patch(`${this.path}/:id`, authenticated, upload("users").single("avatar"), this.userController.updateUser);
    this.router.delete(`${this.path}/:id`, authenticated, this.userController.deleteUser);
  } 
}

export default UserRouter;
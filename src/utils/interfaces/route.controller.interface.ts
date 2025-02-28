import { Router } from "express";

interface RouteController {
  path: string;
  router: Router;
}

export default RouteController;
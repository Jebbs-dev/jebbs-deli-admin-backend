import storeService from "./store.service";
import { Request, Response, NextFunction } from "express";
import HttpException from "@/utils/exceptions/http.exception";

class StoreController {
  private storeService = new storeService();

  /**
   * Create a Store
   */

  public registerStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const storeData = req.body;
      const imageFile = req.file;

      const store = await this.storeService.registerStore(storeData, imageFile);

      res.status(201).json({ store });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to register Store"
        )
      );
    }
  };

  /**
   * Fetch all Stores
   */

  public fetchStores = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stores = await this.storeService.fetchStores();

      res.status(200).send(stores);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch Stores"
        )
      );
    }
  };

  /**
   * Fetch a Store by Id
   */

  public fetchSingleStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const store = await this.storeService.fetchSingleStore(id);

      if (!store) {
        throw new HttpException(404, "Store not found");
      }

      res.status(200).send(store);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch Store"
        )
      );
    }
  };

  public fetchStoreByVendorId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id, userId } = req.params;


      const store = await this.storeService.fetchStoreByVendorId(id, userId);

      if (!store) {
        throw new HttpException(404, "Store not found");
      }

      res.status(200).send(store);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch Store"
        )
      );
    }
  };

  /**
   * Update a Store
   */

  public updateStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const storeData = req.body;
      const imageFile = req.file;

      const updatedStore = await this.storeService.updateStore(
        id,
        storeData,
        imageFile
      );

      res.status(200).send(updatedStore);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to update Store"
        )
      );
    }
  };

  /**
   * Delete a Store
   */

  public deleteStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      await this.storeService.deleteStore(id);

      res.status(204).send("Store deleted!");
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to delete Store"
        )
      );
    }
  };
}
export default StoreController;

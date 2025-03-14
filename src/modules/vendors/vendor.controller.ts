import VendorService from "./vendor.service";
import { Request, Response, NextFunction } from "express";
import HttpException from "@/utils/exceptions/http.exception";

class VendorController {
  private vendorService = new VendorService();

  /**
   * Create a vendor
   */

  public registerVendor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { vendorData } = req.body;
      const imageFile = req.file;

      const vendor = await this.vendorService.registerVendor(
        vendorData,
        imageFile
      );

      res.status(201).json({ vendor });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to register vendor"
        )
      );
    }
  };

  /**
   * Fetch all vendors
   */

  public fetchVendors = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const vendors = await this.vendorService.fetchVendors();

      res.status(200).send(vendors);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch vendors"
        )
      );
    }
  };

  /**
   * Fetch a vendor by Id
   */

  public fetchSingleVendor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const vendor = await this.vendorService.fetchSingleVendor(id);

      if (!vendor) {
        throw new HttpException(404, "Vendor not found");
      }

      res.status(200).send(vendor);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch vendor"
        )
      );
    }
  };

  /**
   * Update a vendor
   */

  public updateVendor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const vendorData = req.body;
      const imageFile = req.file;

      const updatedVendor = await this.vendorService.updateVendor(
        id,
        vendorData,
        imageFile
      );

      res.status(200).send(updatedVendor);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to update vendor"
        )
      );
    }
  };

  /**
   * Delete a vendor
   */

  public deleteVendor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      await this.vendorService.deleteVendor(id);

      res.status(204).send("Vendor deleted!");
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to delete vendor"
        )
      );
    }
  };
}
export default VendorController;

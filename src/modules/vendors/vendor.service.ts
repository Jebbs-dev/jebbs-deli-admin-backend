import prisma from "@/utils/prisma";
import { Vendor } from "@prisma/client";
import cloudinary from "@/config/cloudinary";

class VendorService {
  private prisma = prisma;

  /**
   * Add a vendor
   */

  public registerVendor = async (
    vendorData: Vendor,
    imageFile?: Express.Multer.File
  ) => {
    try {
      const uploadResponse = await cloudinary.uploader.upload(imageFile!.path, {
        folder: "vendors",
      });

      const newVendor = await this.prisma.vendor.create({
        data: {
          ...vendorData,
          logo: uploadResponse.secure_url, // Store Cloudinary URL
        },
      });

      return newVendor;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to register vendor"
      );
    }
  };

  /**
   * Fetch all vendors
   */
  public fetchVendors = async () => {
    try {
      const vendors = await this.prisma.vendor.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include:{
          products: true
        }
      });

      return vendors;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch vendors"
      );
    }
  };

  /**
   * Fetch single vendor
   */

  public fetchSingleVendor = async (vendorId: string) => {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        include:{
          products: true
        }
      });

      return vendor;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch vendor"
      );
    }
  };

  /**
   * update vendor
   */

  public updateVendor = async (
    vendorId: string,
    vendorData: Partial<Vendor>,
    imageFile?: Express.Multer.File
  ) => {
    try {
      let imageUrl = undefined;

      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "vendors",
          }
        );
        imageUrl = uploadResponse.secure_url;
      }

      const updatedVendor = await this.prisma.vendor.update({
        where: { id: vendorId },
        data: { ...vendorData, ...(imageUrl && { logo: imageUrl }) },
      });

      return updatedVendor;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to update vendor"
      );
    }
  };

  /**
   * delete vendor
   */
  public deleteVendor = async (vendorId: string) => {
    try {
      await this.prisma.vendor.delete({
        where: { id: vendorId },
      });

      return true;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete vendor"
      );
    }
  };
}

export default VendorService;

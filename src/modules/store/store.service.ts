import prisma from "@/utils/prisma";
import { Store } from "@prisma/client";
import cloudinary from "@/config/cloudinary";

class StoreService {
  private prisma = prisma;

  /**
   * Add a Store
   */

  public registerStore = async (
    storeData: Store,
    imageFile?: Express.Multer.File
  ) => {
    try {
      // const uploadResponse = await cloudinary.uploader.upload(imageFile!.path, {
      //   folder: "Stores",
      // });

      let imageUrl = undefined;

      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "stores",
          }
        );
        imageUrl = uploadResponse.secure_url;
      }

      const newStore = await this.prisma.store.create({
        data: {
          ...storeData,
          logo: imageUrl && imageUrl, // Store Cloudinary URL
        },
      });

      return newStore;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to register Store"
      );
    }
  };

  /**
   * Fetch all Stores
   */
  public fetchStores = async () => {
    try {
      const stores = await this.prisma.store.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          products: true,
        },
      });

      return stores;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch Stores"
      );
    }
  };

  /**
   * Fetch single Store
   */

  public fetchSingleStore = async (storeId: string) => {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        include: {
          products: true,
        },
      });

      return store;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch Store"
      );
    }
  };

  public fetchStoreByVendorId = async (storeId: string, vendorId: string) => {
    try {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId, userId: vendorId },
        include: {
          products: true,
          admin: true,
        },
      });

      return store;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch Store"
      );
    }
  };

  /**
   * update Store
   */

  public updateStore = async (
    storeId: string,
    storeData: Partial<Store>,
    imageFile?: Express.Multer.File
  ) => {
    try {
      let imageUrl = undefined;

      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "stores",
          }
        );
        imageUrl = uploadResponse.secure_url;
      }

      const updatedStore = await this.prisma.store.update({
        where: { id: storeId },
        data: { ...storeData, ...(imageUrl && { logo: imageUrl }) },
      });

      return updatedStore;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to update Store"
      );
    }
  };

  /**
   * delete Store
   */
  public deleteStore = async (storeId: string) => {
    try {
      await this.prisma.store.delete({
        where: { id: storeId },
      });

      return true;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete Store"
      );
    }
  };
}

export default StoreService;

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
  public fetchFilteredStores = async (filters?: any) => {
    const {
      search,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters || {};

    try {
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { address: { contains: search, mode: "insensitive" } },
        ];
      }

      if (startDate || endDate) {
        whereClause.createdAt = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
      const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

      const [stores, total] = await prisma.$transaction([
        prisma.store.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            products: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.store.count({ where: whereClause }),
      ]);

      return {
        stores,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
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
    billboardFile?: Express.Multer.File,
    logoFile?: Express.Multer.File
  ) => {
    try {
      let billboardUrl = undefined;
      let logoUrl = undefined;

      if (billboardFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          billboardFile.path,
          {
            folder: "stores",
          }
        );
        billboardUrl = uploadResponse.secure_url;
      }

      if (logoFile) {
        const uploadResponse = await cloudinary.uploader.upload(logoFile.path, {
          folder: "stores",
        });
        logoUrl = uploadResponse.secure_url;
      }

      const updatedStore = await this.prisma.store.update({
        where: { id: storeId },
        data: {
          ...storeData,
          ...(billboardUrl && { billboard: billboardUrl }),
          ...(logoUrl && { logo: logoUrl }),
        },
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

import prisma from "@/utils/prisma";
import { Product } from "@prisma/client";
import cloudinary from "@/config/cloudinary";

class ProductService {
  private prisma = prisma;

  /**
   * Add a product
   */

  public addProduct = async (
    product: Product,
    imageFile?: Express.Multer.File
  ) => {
    try {
      const uploadResponse = await cloudinary.uploader.upload(imageFile!.path, {
        folder: "products",
      });

      const newProduct = await this.prisma.product.create({
        data: {
          ...product,
          image: uploadResponse.secure_url, // Store Cloudinary URL
        },
      });

      return newProduct;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to register vendor"
      );
    }
  };

  /**
   * Fetch all products
   */

  public fetchProducts = async () => {
    try {
      const products = await this.prisma.product.findMany({
        include: {
          store: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return products;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch products"
      );
    }
  };

  /**
   * Fetch a product by id
   */

  public fetchSingleProduct = async (productId: string) => {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          store: true,
        },
      });

      return product;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch product"
      );
    }
  };

  public fetchSingleProductByStore = async (
    productId: string,
    storeId: string
  ) => {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, storeId },
        include: {
          store: true,
        },
      });

      return product;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch product"
      );
    }
  };

  public fetchProductsByStore = async (storeId: string) => {
    try {
      const product = await this.prisma.product.findMany({
        where: { storeId },
        include: {
          store: true,
        },
      });

      return product;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to fetch product"
      );
    }
  };

  public fetchFilteredProducts = async (filters?: any) => {
    const {
      search,
      isFeatured,
      storeId,
      offset,
      limit,
      sortBy = "createdAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = filters || {};

    const whereClause: any = {};

    if (search) {
      const searchTerm = search.toLowerCase();

      const findCategory = this.getCategoryEnum(searchTerm);

      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        ...(findCategory ? [{ category: findCategory }] : []),
      ];
    }

    if (isFeatured !== undefined)
      whereClause.isFeatured = isFeatured === "true";
    if (storeId) whereClause.storeId = storeId;

    if (startDate || endDate) {
      whereClause.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const offsetNumber = offset !== undefined ? parseInt(offset, 10) : 0;
    const limitNumber = limit !== undefined ? parseInt(limit, 10) : 10;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        orderBy: {
          [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
        },
        include: {
          store: true,
        },
        skip: offsetNumber,
        take: limitNumber,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return {
      products,
      limit: limitNumber,
      offset: offsetNumber,
      total,
      next: offsetNumber + limitNumber < total,
      previous: offsetNumber > 0,
    };
  };

  public fetchFilteredProductsByStore = async (
    storeId: string,
    filters?: any
  ) => {
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
      const whereClause: any = {
        storeId,
      };

      if (search) {
        const searchTerm = search.toLowerCase();

        const findCategory = this.getCategoryEnum(searchTerm);

        whereClause.OR = [
          { name: { contains: search, mode: "insensitive" } },
          ...(findCategory ? [{ category: findCategory }] : []),
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

      // const products = prisma.product.findMany({
      //   where: whereClause,
      //   orderBy: {
      //     [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
      //   },
      //   skip: offsetNumber,
      //   take: limitNumber,
      // });

      // const total = await prisma.product.count({
      //   where: whereClause,
      // });

      const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where: whereClause,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
          },
          include: {
            store: true,
          },
          skip: offsetNumber,
          take: limitNumber,
        }),
        prisma.product.count({ where: whereClause }),
      ]);

      return {
        products,
        limit: limitNumber,
        offset: offsetNumber,
        total,
        next: offsetNumber + limitNumber < total,
        previous: offsetNumber > 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to update product"
      );
    }
  };

  /**
   * Update a product
   */

  public updateProduct = async (
    productId: string,
    productData: Partial<Product>,
    imageFile?: Express.Multer.File
  ) => {
    try {
      let imageUrl = undefined;

      if (imageFile) {
        const uploadResponse = await cloudinary.uploader.upload(
          imageFile.path,
          {
            folder: "products",
          }
        );
        imageUrl = uploadResponse.secure_url;
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...productData,
          ...(imageUrl && { image: imageUrl }),
        },
      });

      return updatedProduct;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to update product"
      );
    }
  };

  /**
   * Delete a product
   */

  public deleteProduct = async (productId: string) => {
    try {
      await this.prisma.product.delete({
        where: { id: productId },
      });

      return true;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to delete product"
      );
    }
  };

  public getCategoryEnum = (searchTerm: string) => {
    const allCategories = [
      "meal",
      "drink",
      "snack",
      "dessert",
      "sides",
      "small_chops",
      "chicken",
      "pizza",
      "burger",
    ];
    const matched = allCategories.find((c) => c.toLowerCase() === searchTerm);
    return matched ?? null;
  };
}

export default ProductService;

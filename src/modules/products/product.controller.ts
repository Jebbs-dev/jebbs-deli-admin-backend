import HttpException from "@/utils/exceptions/http.exception";
import ProductService from "./product.service";
import { Request, Response, NextFunction } from "express";

class ProductController {
  private productService = new ProductService();

  /**
   * Add a product
   */

  public addProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { productData } = req.body;
      const imageFile = req.file;

      // if (!imageFile) {
      //   res.status(400).json({ message: "Image file is required" });
      //   return;
      // }

      const product = await this.productService.addProduct(
        productData,
        imageFile
      );

      res.status(201).json({ product });
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to add product"
        )
      );
    }
  };

  /**
   * Fetch all products
   */

  public fetchProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const products = await this.productService.fetchProducts();

      res.status(200).send(products);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch products"
        )
      );
    }
  };

  public fetchProductsCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { storeId } = req.params;

      const products = await this.productService.fetchProductsCount(storeId);

      res.status(200).send(products);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch products"
        )
      );
    }
  };

  /**
   * Fetch a product by Id
   */

  public fetchSingleProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const product = await this.productService.fetchSingleProduct(id);

      if (!product) {
        throw new HttpException(404, "Product not found");
      }

      res.status(200).send(product);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch product"
        )
      );
    }
  };

  public fetchFilteredProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = req.query; // Capture filters from URL

      const products = await this.productService.fetchFilteredProducts(query);

      res.status(200).send(products);
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
   * Update a product
   */

  // public updateProduct = async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> => {
  //   try {
  //     const { id } = req.params;

  //     const productData = req.body;

  //     console.log(productData);

  //     const imageFile = req.file;

  //     console.log(imageFile);

  //     // if (!imageFile) {
  //     //   res.status(400).json({ message: "Image file is required" });
  //     //   return;
  //     // }

  //     const updatedProduct = await this.productService.updateProduct(
  //       id,
  //       productData,
  //       imageFile
  //     );

  //     res.status(200).send(updatedProduct);
  //   } catch (error) {
  //     next(
  //       new HttpException(
  //         500,
  //         error ? (error as Error).message : "Failed to update product"
  //       )
  //     );
  //   }
  // };

  public updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const productData = {
        ...req.body,
        price: req.body.price && parseFloat(req.body.price), // Convert back to float
        stock: req.body.stock && parseInt(req.body.stock, 10), // Convert back to integer
        size: req.body.size ? req.body.size : null,
        isAvailable: req.body.isAvailable && req.body.isAvailable === "true", // Convert back to boolean
        isFeatured: req.body.isFeatured && req.body.isFeatured === "true", // Convert back to boolean
      };

      const imageFile = req.file;

      const updatedProduct = await this.productService.updateProduct(
        id,
        productData,
        imageFile
      );

      res.status(200).send(updatedProduct);
    } catch (error) {
      next(
        new HttpException(
          500,
          error instanceof Error ? error.message : "Failed to update product"
        )
      );
    }
  };

  public fetchProductsByStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { storeId } = req.params;

      const product = await this.productService.fetchProductsByStore(storeId);

      if (!product) {
        throw new HttpException(404, "Store not found");
      }

      res.status(200).send(product);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch Store"
        )
      );
    }
  };

  public fetchFilteredProductsByStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { storeId } = req.params;
      const query = req.query;

      const product = await this.productService.fetchFilteredProductsByStore(
        storeId,
        query
      );

      if (!product) {
        throw new HttpException(404, "Store not found");
      }

      res.status(200).json(product);
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to fetch Store"
        )
      );
    }
  };

  public fetchSingleProductByStore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id, storeId } = req.params;

      const product = await this.productService.fetchSingleProductByStore(
        id,
        storeId
      );

      if (!product) {
        throw new HttpException(404, "Store not found");
      }

      res.status(200).send(product);
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
   * Delete a product
   */

  public deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      await this.productService.deleteProduct(id);

      res.status(204).send("Product deleted!");
    } catch (error) {
      next(
        new HttpException(
          500,
          error ? (error as Error).message : "Failed to delete product"
        )
      );
    }
  };
}

export default ProductController;

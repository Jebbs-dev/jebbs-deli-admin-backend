import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "@/config/cloudinary";
import { Options } from "multer-storage-cloudinary";

// Function to configure dynamic storage based on entity type
const createStorage = (folder: string) => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      resource_type: "auto",
      folder: folder,
      allowedFormats: ["jpg", "png", "jpeg"],
      public_id: (req, file) => file.originalname.replace(/\.[^/.]+$/, "")
    } as Options["params"]
  });
};

// Middleware generator for different entities
const upload = (folder: string) => multer({ storage: createStorage(folder) });

export default upload;

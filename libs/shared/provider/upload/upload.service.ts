import { Injectable } from '@nestjs/common';
import { ConfigService } from '@libs/shared/system/config/config.service';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.cloudinaryCloudName,
      api_key: configService.cloudinaryApiKey,
      api_secret: configService.cloudinaryApiSecret,
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    const uploadResponse = await cloudinary.uploader.upload(file.path, {
      folder,
    });
    return uploadResponse.secure_url;
  }
}

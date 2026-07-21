import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class CreateProductCommand {
  constructor(
    public readonly productData: Record<string, any>,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateProductCommand) {
    const { productData, imageFile } = command;
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'products');
    }
    return this.prisma.product.create({
      data: { ...productData, image: imageUrl || '' } as any,
    });
  }
}

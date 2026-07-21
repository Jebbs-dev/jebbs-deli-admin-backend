import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly productData: Record<string, any>,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateProductCommand) {
    const { productId, productData, imageFile } = command;
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'products');
    }
    return this.prisma.product.update({
      where: { id: productId },
      data: { ...productData, ...(imageUrl && { image: imageUrl }) } as any,
    });
  }
}

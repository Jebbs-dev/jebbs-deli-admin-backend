import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { UploadService } from '@shared/provider/upload/upload.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';

export class UpdateProductCommand {
  constructor(
    public readonly actor: Actor,
    public readonly productId: string,
    public readonly productData: object,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly access: AccessService,
  ) {}

  async execute(command: UpdateProductCommand) {
    const { actor, productId, productData, imageFile } = command;
    await this.access.assertProductStoreAccess(productId, actor);

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'products');
    }
    const { storeId: _storeId, ...safeData } = productData as Record<string, unknown>;
    return this.prisma.product.update({
      where: { id: productId },
      data: { ...safeData, ...(imageUrl && { image: imageUrl }) } as never,
    });
  }
}

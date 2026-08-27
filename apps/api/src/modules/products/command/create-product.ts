import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@shared/system/database/prisma.service';
import { UploadService } from '@shared/provider/upload/upload.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';

export class CreateProductCommand {
  constructor(
    public readonly actor: Actor,
    public readonly productData: object,
    public readonly imageFile?: Express.Multer.File,
    public readonly pathStoreId?: string,
  ) {}
}

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly access: AccessService,
  ) {}

  async execute(command: CreateProductCommand) {
    const { actor, productData, imageFile, pathStoreId } = command;
    const payload = productData as Record<string, unknown>;
    const bodyStoreId = payload.storeId ? String(payload.storeId) : '';
    const storeId = pathStoreId || bodyStoreId;
    if (!storeId) {
      throw new BadRequestException('storeId is required');
    }
    if (pathStoreId && bodyStoreId && pathStoreId !== bodyStoreId) {
      throw new BadRequestException('storeId does not match the path');
    }
    await this.access.assertStoreAccess(storeId, actor);

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'products');
    }
    const { storeId: _ignored, ...rest } = payload;
    return this.prisma.product.create({
      data: { ...rest, storeId, image: imageUrl || '' } as never,
    });
  }
}

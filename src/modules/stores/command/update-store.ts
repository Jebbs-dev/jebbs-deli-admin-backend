import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class UpdateStoreCommand {
  constructor(
    public readonly storeId: string,
    public readonly storeData: Record<string, any>,
    public readonly billboardFile?: Express.Multer.File,
    public readonly logoFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateStoreCommand)
export class UpdateStoreHandler implements ICommandHandler<UpdateStoreCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateStoreCommand) {
    const { storeId, storeData, billboardFile, logoFile } = command;
    let billboardUrl: string | undefined;
    let logoUrl: string | undefined;
    if (billboardFile) {
      billboardUrl = await this.uploadService.uploadImage(billboardFile, 'stores');
    }
    if (logoFile) {
      logoUrl = await this.uploadService.uploadImage(logoFile, 'stores');
    }
    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...storeData,
        ...(billboardUrl && { billboard: billboardUrl }),
        ...(logoUrl && { logo: logoUrl }),
      },
    });
  }
}

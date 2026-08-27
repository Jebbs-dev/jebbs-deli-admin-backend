import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { UploadService } from '@shared/provider/upload/upload.service';
import { AccessService, type Actor } from '@shared/features/auth/access.service';
import { pickStoreWriteFields } from '@shared/features/auth/store-update-fields';

export class UpdateStoreCommand {
  constructor(
    public readonly storeId: string,
    public readonly actor: Actor,
    public readonly storeData: object,
    public readonly billboardFile?: Express.Multer.File,
    public readonly logoFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateStoreCommand)
export class UpdateStoreHandler implements ICommandHandler<UpdateStoreCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly access: AccessService,
  ) {}

  async execute(command: UpdateStoreCommand) {
    const { storeId, actor, storeData, billboardFile, logoFile } = command;
    await this.access.assertStoreAccess(storeId, actor);

    let billboardUrl: string | undefined;
    let logoUrl: string | undefined;
    if (billboardFile) {
      billboardUrl = await this.uploadService.uploadImage(billboardFile, 'stores');
    }
    if (logoFile) {
      logoUrl = await this.uploadService.uploadImage(logoFile, 'stores');
    }

    const data = pickStoreWriteFields(storeData, actor.role === 'ADMIN');

    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...data,
        ...(billboardUrl && { billboard: billboardUrl }),
        ...(logoUrl && { logo: logoUrl }),
      } as Prisma.StoreUpdateInput,
    });
  }
}

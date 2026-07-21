import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class CreateStoreCommand {
  constructor(
    public readonly storeData: Record<string, any>,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(CreateStoreCommand)
export class CreateStoreHandler implements ICommandHandler<CreateStoreCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateStoreCommand) {
    const { storeData, imageFile } = command;
    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'stores');
    }
    return this.prisma.store.create({
      data: { ...storeData, logo: imageUrl || null } as any,
    });
  }
}

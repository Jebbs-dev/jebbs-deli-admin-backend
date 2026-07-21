import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly userData: Record<string, any>,
    public readonly storeData?: Record<string, any>,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: UpdateUserCommand) {
    const { userId, userData, storeData, imageFile } = command;

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'users');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        ...(imageUrl && { avatar: imageUrl }),
        ...(storeData && {
          store: {
            upsert: {
              create: storeData as any,
              update: storeData as any,
            },
          },
        }),
      } as any,
    });
  }
}

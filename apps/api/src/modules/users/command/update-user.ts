import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { UploadService } from '@shared/provider/upload/upload.service';
import { userPasswordOmit } from '@shared/system/common/safe-selects';
import type { Actor } from '@shared/features/auth/access.service';

const ALLOWED_USER_FIELDS = new Set(['name', 'email', 'telephone', 'address']);

export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly actor: Actor,
    public readonly userData: Record<string, unknown>,
    public readonly storeData?: Record<string, unknown>,
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
    const { userId, actor, userData, storeData, imageFile } = command;

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'users');
    }

    const safeUser: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(userData ?? {})) {
      if (ALLOWED_USER_FIELDS.has(key) && value !== undefined) {
        safeUser[key] = value;
      }
    }

    const nestedStore =
      actor.role === 'ADMIN' && storeData
        ? {
            store: {
              upsert: {
                create: storeData,
                update: storeData,
              },
            },
          }
        : {};

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...safeUser,
        ...(imageUrl && { avatar: imageUrl }),
        ...nestedStore,
      } as never,
      omit: userPasswordOmit,
    });
  }
}

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { UploadService } from '@shared/provider/upload/upload.service';
import type { Actor } from '@shared/features/auth/access.service';
import { pickStoreWriteFields } from '@shared/features/auth/store-update-fields';

export class CreateStoreCommand {
  constructor(
    public readonly actor: Actor,
    public readonly storeData: object,
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
    const { actor, storeData, imageFile } = command;
    if (actor.role !== 'ADMIN' && actor.role !== 'VENDOR') {
      throw new BadRequestException('Not allowed to create a store');
    }

    let imageUrl: string | undefined;
    if (imageFile) {
      imageUrl = await this.uploadService.uploadImage(imageFile, 'stores');
    }

    const data = pickStoreWriteFields(storeData, actor.role === 'ADMIN');
    const ownerId = actor.role === 'VENDOR' ? actor.id : undefined;

    try {
      return await this.prisma.store.create({
        data: {
          ...data,
          isActive: false,
          ...(ownerId ? { userId: ownerId } : {}),
          logo: imageUrl || null,
        } as Prisma.StoreCreateInput,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('This vendor already has a store');
      }
      throw err;
    }
  }
}

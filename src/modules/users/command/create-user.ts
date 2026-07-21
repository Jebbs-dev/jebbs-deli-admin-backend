import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/shared/system/database/prisma.service';
import { CryptoService } from '@libs/shared/features/auth/crypto.service';
import { UploadService } from '@libs/shared/provider/upload/upload.service';

export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly telephone?: string,
    public readonly address?: string,
    public readonly imageFile?: Express.Multer.File,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly uploadService: UploadService,
  ) {}

  async execute(command: CreateUserCommand) {
    const { name, email, password, telephone, address, imageFile } = command;
    if (!password) throw new BadRequestException('Password is required');

    const hashedPassword = this.cryptoService.hashPassword(password);

    let avatarUrl: string | undefined;
    if (imageFile) {
      avatarUrl = await this.uploadService.uploadImage(imageFile, 'users');
    }

    return this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        telephone: telephone || null,
        address: address || null,
        avatar: avatarUrl || null,
        role: 'USER',
      },
    });
  }
}

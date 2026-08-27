import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { userPasswordOmit } from '@shared/system/common/safe-selects';
import type { Actor } from '@shared/features/auth/access.service';

export class GetUserByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly actor: Actor,
  ) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByIdQuery) {
    if (query.actor.role !== 'ADMIN' && query.actor.id !== query.userId) {
      throw new ForbiddenException('Not allowed to access this user');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: query.userId },
      omit: userPasswordOmit,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

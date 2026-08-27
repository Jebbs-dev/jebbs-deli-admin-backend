import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@shared/system/database/prisma.service';
import { userPasswordOmit, storePublicOmit } from '@shared/system/common/safe-selects';
import type { Actor } from '@shared/features/auth/access.service';

export class GetVendorAdminByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly actor: Actor,
  ) {}
}

@QueryHandler(GetVendorAdminByIdQuery)
export class GetVendorAdminByIdHandler
  implements IQueryHandler<GetVendorAdminByIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetVendorAdminByIdQuery) {
    if (query.actor.role !== 'ADMIN' && query.actor.id !== query.userId) {
      throw new ForbiddenException('Not allowed to access this vendor');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: query.userId, role: 'VENDOR' },
      omit: userPasswordOmit,
      include: { store: { omit: storePublicOmit } },
    });
    if (!user) throw new NotFoundException('Vendor not found');
    return user;
  }
}

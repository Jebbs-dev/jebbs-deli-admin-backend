import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/shared/system/database/prisma.service';

export class GetCustomerCountQuery {}

@QueryHandler(GetCustomerCountQuery)
export class GetCustomerCountHandler implements IQueryHandler<GetCustomerCountQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const totalCustomers = await this.prisma.user.count({ where: { role: 'USER' } });
    return { totalCustomers };
  }
}

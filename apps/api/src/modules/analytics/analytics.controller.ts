import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GetAnalyticsSummaryQuery } from './query/get-analytics-summary';

const rangeSchema = z.object({
  range: z.enum(['1d', '1w', '1m', '1y']).default('1w'),
  storeId: z.string().optional(),
});
class AnalyticsQueryDto extends createZodDto(rangeSchema) {}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Roles('ADMIN', 'VENDOR')
  @Get('summary')
  async summary(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: { id: string; role: string; store?: { id: string } },
  ) {
    const storeId =
      user.role === 'VENDOR'
        ? user.store?.id
        : query.storeId;

    return this.queryBus.execute(
      new GetAnalyticsSummaryQuery(query.range, storeId, user),
    );
  }
}

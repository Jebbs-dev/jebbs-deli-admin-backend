import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from './analytics.controller';
import { GetAnalyticsSummaryHandler } from './query/get-analytics-summary';

@Module({
  imports: [CqrsModule],
  controllers: [AnalyticsController],
  providers: [GetAnalyticsSummaryHandler],
})
export class AnalyticsModule {}

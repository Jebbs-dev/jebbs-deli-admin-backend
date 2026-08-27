import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  ClaimDeliveryCommand,
  RiderProgressCommand,
} from './command/delivery-actions';
import { GetClaimableDeliveriesQuery } from './query/get-claimable';
import { GetRiderDeliveriesQuery } from './query/get-rider-deliveries';
import { UpdateRiderAvailabilityCommand } from './command/update-availability';
import { GetAvailableRidersQuery } from './query/get-available-riders';

const progressSchema = z.object({
  failureReason: z.string().optional(),
});
class ProgressDto extends createZodDto(progressSchema) {}

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});
class AvailabilityDto extends createZodDto(availabilitySchema) {}

@Controller('deliveries')
export class DeliveriesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Roles('RIDER')
  @Get('claimable')
  async claimable() {
    return this.queryBus.execute(new GetClaimableDeliveriesQuery());
  }

  @Roles('RIDER')
  @Get('mine')
  async mine(
    @CurrentUser('id') riderId: string,
    @Query('history') history?: string,
  ) {
    return this.queryBus.execute(
      new GetRiderDeliveriesQuery(riderId, history === 'true'),
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('riders/available')
  async availableRiders() {
    return this.queryBus.execute(new GetAvailableRidersQuery());
  }

  @Roles('RIDER')
  @Post('claim/:orderId')
  async claim(
    @Param('orderId') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.commandBus.execute(new ClaimDeliveryCommand(orderId, riderId));
  }

  @Roles('RIDER')
  @Post(':orderId/pickup')
  async pickup(
    @Param('orderId') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.commandBus.execute(
      new RiderProgressCommand(orderId, riderId, 'pickup'),
    );
  }

  @Roles('RIDER')
  @Post(':orderId/in-transit')
  async inTransit(
    @Param('orderId') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.commandBus.execute(
      new RiderProgressCommand(orderId, riderId, 'in_transit'),
    );
  }

  @Roles('RIDER')
  @Post(':orderId/delivered')
  async delivered(
    @Param('orderId') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.commandBus.execute(
      new RiderProgressCommand(orderId, riderId, 'delivered'),
    );
  }

  @Roles('RIDER')
  @Post(':orderId/failed')
  async failed(
    @Param('orderId') orderId: string,
    @CurrentUser('id') riderId: string,
    @Body() body: ProgressDto,
  ) {
    return this.commandBus.execute(
      new RiderProgressCommand(
        orderId,
        riderId,
        'failed',
        body.failureReason,
      ),
    );
  }

  @Roles('RIDER')
  @Patch('availability')
  async availability(
    @CurrentUser('id') riderId: string,
    @Body() body: AvailabilityDto,
  ) {
    return this.commandBus.execute(
      new UpdateRiderAvailabilityCommand(riderId, body.isAvailable),
    );
  }
}

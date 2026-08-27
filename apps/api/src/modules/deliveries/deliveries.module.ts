import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DeliveriesController } from './deliveries.controller';
import {
  AssignRiderHandler,
  ClaimDeliveryHandler,
  RiderProgressHandler,
} from './command/delivery-actions';
import { UpdateRiderAvailabilityHandler } from './command/update-availability';
import {
  GetAvailableRidersHandler,
  GetClaimableDeliveriesHandler,
  GetRiderDeliveriesHandler,
} from './query/get-claimable';
import { OrdersModule } from '../orders/orders.module';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [CqrsModule, OrdersModule, SettlementModule],
  controllers: [DeliveriesController],
  providers: [
    AssignRiderHandler,
    ClaimDeliveryHandler,
    RiderProgressHandler,
    UpdateRiderAvailabilityHandler,
    GetClaimableDeliveriesHandler,
    GetRiderDeliveriesHandler,
    GetAvailableRidersHandler,
  ],
})
export class DeliveriesModule {}

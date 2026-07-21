import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';

import { Roles } from '@libs/shared/features/auth/decorators/roles.decorator';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { InitializePaymentCommand } from './command/initialize-payment';
import { VerifyPaymentCommand } from './command/verify-payment';
import { AdminVerifyPaymentCommand } from './command/admin-verify-payment';
import { GetPaymentByIdQuery } from './query/get-payment-by-id';
import { GetPaymentsQuery } from './query/get-payments';
import { GetPaymentsByUserQuery } from './query/get-payments-by-user';
import { GetPaymentsByStoreQuery } from './query/get-payments-by-store';
import { GetPaymentsByOrderQuery } from './query/get-payments-by-order';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';
import { createZodDto } from 'nestjs-zod';
import {
  PaginatedPaymentsResponseDto,
  PaymentInitResponseDto,
  RecordArrayResponseDto,
  RecordResponseDto,
  UnknownRecordResponseDto,
} from '@libs/shared/system/common/schemas/response.schemas';

class PaymentQueryDto extends createZodDto(paginationQuerySchema) {}

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('initialise')
  @ZodResponse({
    status: 201,
    description: 'Initialises a Paystack payment and returns authorization details',
    type: PaymentInitResponseDto,
  })
  async initialize(@Body() body: InitializePaymentDto) {
    const { paymentData, userId, storeId, orderId } = body;
    return this.commandBus.execute(
      new InitializePaymentCommand(paymentData, userId, storeId, orderId),
    );
  }

  @Get('verify/:reference')
  @ZodResponse({
    status: 200,
    description: 'Verifies a payment by Paystack reference',
    type: UnknownRecordResponseDto,
  })
  async verify(@Param('reference') reference: string) {
    return this.commandBus.execute(new VerifyPaymentCommand(reference));
  }

  @Roles('ADMIN')
  @Get('admin/verify/:reference')
  @ZodResponse({
    status: 200,
    description: 'Admin verification of a payment by Paystack reference',
    type: UnknownRecordResponseDto,
  })
  async adminVerify(@Param('reference') reference: string) {
    return this.commandBus.execute(new AdminVerifyPaymentCommand(reference));
  }

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns all payments',
    type: RecordArrayResponseDto,
  })
  async findAll() {
    return this.queryBus.execute(new GetPaymentsQuery());
  }

  @Get('store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated payments for a specific store',
    type: PaginatedPaymentsResponseDto,
  })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query() filters: PaymentQueryDto,
  ) {
    return this.queryBus.execute(new GetPaymentsByStoreQuery(storeId, filters));
  }

  @Get('user/:userId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated payments for a specific user',
    type: PaginatedPaymentsResponseDto,
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() filters: PaymentQueryDto,
  ) {
    return this.queryBus.execute(new GetPaymentsByUserQuery(userId, filters));
  }

  @Get('order/:orderId')
  @ZodResponse({
    status: 200,
    description: 'Returns all payments for a specific order',
    type: RecordArrayResponseDto,
  })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.queryBus.execute(new GetPaymentsByOrderQuery(orderId));
  }

  @Get(':id')
  @ZodResponse({
    status: 200,
    description: 'Returns a payment by ID',
    type: RecordResponseDto,
  })
  async findById(@Param('id') id: string) {
    return this.queryBus.execute(new GetPaymentByIdQuery(id));
  }
}

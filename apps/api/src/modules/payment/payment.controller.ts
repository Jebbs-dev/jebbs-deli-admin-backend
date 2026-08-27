import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse } from 'nestjs-zod';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { Public } from '@shared/features/auth/decorators/public.decorator';
import { InitializePaymentCommand } from './command/initialize-payment';
import { VerifyPaymentCommand } from './command/verify-payment';
import { AdminVerifyPaymentCommand } from './command/admin-verify-payment';
import { UpsertStorePayoutCommand } from './command/upsert-store-payout';
import { GetPaymentByIdQuery } from './query/get-payment-by-id';
import { GetPaymentsQuery } from './query/get-payments';
import { GetPaymentsByUserQuery } from './query/get-payments-by-user';
import { GetPaymentsByStoreQuery } from './query/get-payments-by-store';
import { GetPaymentsByOrderQuery } from './query/get-payments-by-order';
import { paginationQuerySchema } from '@shared/system/common/dto/pagination.dto';
import { PaystackService } from '@shared/provider/payment/paystack.service';
import { OrderAccessService } from '../orders/services/order-access.service';
import {
  PaginatedPaymentsResponseDto,
  PaymentInitResponseDto,
  RecordArrayResponseDto,
  RecordResponseDto,
  UnknownRecordResponseDto,
} from '@shared/system/common/schemas/response.schemas';

class PaymentQueryDto extends createZodDto(paginationQuerySchema) {}

const initSchema = z.object({
  orderId: z.string().min(1),
  email: z.email().optional(),
  callback_url: z.string().url().optional(),
  paymentData: z
    .object({
      email: z.email().optional(),
      callback_url: z.string().url().optional(),
      amount: z.string().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  // legacy ignored fields
  userId: z.string().optional(),
  storeId: z.string().optional(),
});
class InitializePaymentDto extends createZodDto(initSchema) {}

const payoutSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().optional(),
  accountNumber: z.string().min(5),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
});
class StorePayoutDto extends createZodDto(payoutSchema) {}

const resolveSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().min(5),
});
class ResolveAccountDto extends createZodDto(resolveSchema) {}

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly paystackService: PaystackService,
    private readonly orderAccess: OrderAccessService,
  ) {}

  @Post('initialise')
  @Roles('USER', 'ADMIN')
  @ZodResponse({
    status: 201,
    description: 'Initialises a Paystack payment and returns authorization details',
    type: PaymentInitResponseDto,
  })
  async initialize(
    @Body() body: InitializePaymentDto,
    @CurrentUser() user: { id: string; role: string; email?: string },
  ) {
    const email =
      body.paymentData?.email || body.email || user.email || '';
    const callbackUrl =
      body.paymentData?.callback_url || body.callback_url;
    return this.commandBus.execute(
      new InitializePaymentCommand(user, body.orderId, email, callbackUrl),
    );
  }

  @Get('verify/:reference')
  @Roles('USER', 'ADMIN', 'VENDOR')
  @ZodResponse({
    status: 200,
    description: 'Verifies a payment by Paystack reference',
    type: UnknownRecordResponseDto,
  })
  async verify(
    @Param('reference') reference: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(new VerifyPaymentCommand(user, reference));
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

  @Roles('ADMIN', 'VENDOR')
  @Get('banks')
  async banks(@Query('currency') currency?: string) {
    return this.paystackService.listBanks(currency || 'NGN');
  }

  @Roles('ADMIN', 'VENDOR')
  @Post('resolve-account')
  async resolve(@Body() body: ResolveAccountDto) {
    return this.paystackService.resolveAccountNumber(
      body.accountNumber,
      body.bankCode,
    );
  }

  @Roles('ADMIN', 'VENDOR')
  @Patch('store/:storeId/payout')
  async upsertPayout(
    @Param('storeId') storeId: string,
    @Body() body: StorePayoutDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.commandBus.execute(
      new UpsertStorePayoutCommand(storeId, user, body),
    );
  }

  @Roles('ADMIN')
  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns all payments',
    type: RecordArrayResponseDto,
  })
  async findAll() {
    return this.queryBus.execute(new GetPaymentsQuery());
  }

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated payments for a specific store',
    type: PaginatedPaymentsResponseDto,
  })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query() filters: PaymentQueryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.assertStoreAccess(storeId, user);
    return this.queryBus.execute(new GetPaymentsByStoreQuery(storeId, filters));
  }

  @Get('user/:userId')
  @Roles('USER', 'ADMIN')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated payments for a specific user',
    type: PaginatedPaymentsResponseDto,
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() filters: PaymentQueryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role !== 'ADMIN' && user.id !== userId) {
      await this.orderAccess.assertUserOwnsOrders(userId, user);
    }
    return this.queryBus.execute(new GetPaymentsByUserQuery(userId, filters));
  }

  @Get('order/:orderId')
  @Roles('USER', 'ADMIN', 'VENDOR')
  @ZodResponse({
    status: 200,
    description: 'Returns all payments for a specific order',
    type: RecordArrayResponseDto,
  })
  async findByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.orderAccess.getOrderForActor(orderId, user);
    return this.queryBus.execute(new GetPaymentsByOrderQuery(orderId));
  }

  @Get(':id')
  @Roles('USER', 'ADMIN', 'VENDOR')
  @ZodResponse({
    status: 200,
    description: 'Returns a payment by ID',
    type: RecordResponseDto,
  })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.queryBus.execute(new GetPaymentByIdQuery(id, user));
  }
}

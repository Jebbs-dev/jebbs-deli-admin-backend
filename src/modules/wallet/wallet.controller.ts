import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ZodResponse, createZodDto } from 'nestjs-zod';
import { CurrentUser } from '@libs/shared/features/auth/decorators/current-user.decorator';
import { paginationQuerySchema } from '@libs/shared/system/common/dto/pagination.dto';
import {
  RecordResponseDto,
  UnknownRecordResponseDto,
} from '@libs/shared/system/common/schemas/response.schemas';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { TopupWalletCommand } from './command/topup-wallet';
import { VerifyTopupCommand } from './command/verify-topup';
import { GetWalletQuery } from './query/get-wallet';
import { GetWalletTransactionsQuery } from './query/get-wallet-transactions';

class WalletQueryDto extends createZodDto(paginationQuerySchema) {}

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ZodResponse({
    status: 200,
    description: 'Returns the authenticated user wallet balance and recent ledger',
    type: RecordResponseDto,
  })
  async getWallet(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetWalletQuery(userId));
  }

  @Get('transactions')
  @ZodResponse({
    status: 200,
    description: 'Returns paginated wallet transactions for the authenticated user',
    type: UnknownRecordResponseDto,
  })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() filters: WalletQueryDto,
  ) {
    return this.queryBus.execute(
      new GetWalletTransactionsQuery(userId, filters),
    );
  }

  @Post('topup')
  @ZodResponse({
    status: 201,
    description: 'Initialises a Paystack wallet top-up and returns authorization details',
    type: UnknownRecordResponseDto,
  })
  async topup(
    @CurrentUser('id') userId: string,
    @Body() dto: TopupWalletDto,
  ) {
    return this.commandBus.execute(
      new TopupWalletCommand(userId, dto.amount, dto.callback_url),
    );
  }

  @Get('topup/verify/:reference')
  @ZodResponse({
    status: 200,
    description: 'Verifies a wallet top-up against Paystack and credits the wallet',
    type: UnknownRecordResponseDto,
  })
  async verifyTopup(
    @CurrentUser('id') userId: string,
    @Param('reference') reference: string,
  ) {
    return this.commandBus.execute(new VerifyTopupCommand(userId, reference));
  }
}

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Roles } from '@shared/features/auth/decorators/roles.decorator';
import { CurrentUser } from '@shared/features/auth/decorators/current-user.decorator';
import { AccessService } from '@shared/features/auth/access.service';
import { PrismaService } from '@shared/system/database/prisma.service';
import { SettlementLedgerService } from './settlement-ledger.service';
import { PayoutSchedulerService } from './payout-scheduler.service';
import { UpsertRiderPayoutCommand } from './command/upsert-rider-payout';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const runPayoutSchema = z.object({
  party: z.enum(['VENDOR', 'RIDER']),
  periodKey: z.string().optional(),
});

class RunPayoutDto extends createZodDto(runPayoutSchema) {}

const riderPayoutSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().optional(),
  accountNumber: z.string().min(5),
});

class RiderPayoutDto extends createZodDto(riderPayoutSchema) {}

@Controller()
export class SettlementController {
  constructor(
    private readonly ledger: SettlementLedgerService,
    private readonly payouts: PayoutSchedulerService,
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
    private readonly access: AccessService,
  ) {}

  @Roles('ADMIN', 'VENDOR')
  @Get('store/:storeId/wallet')
  async storeWallet(
    @Param('storeId') storeId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    await this.access.assertStoreAccess(storeId, user);
    return this.ledger.getStoreWallet(storeId);
  }

  @Roles('ADMIN', 'RIDER')
  @Get('riders/me/wallet')
  async myRiderWallet(@CurrentUser() user: { id: string; role: string }) {
    if (user.role !== 'RIDER' && user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return this.ledger.getRiderWallet(user.id);
  }

  @Roles('ADMIN')
  @Get('riders/:userId/wallet')
  async riderWallet(@Param('userId') userId: string) {
    return this.ledger.getRiderWallet(userId);
  }

  @Roles('ADMIN', 'RIDER')
  @Post('riders/me/payout')
  async upsertMyRiderPayout(
    @CurrentUser() user: { id: string; role: string },
    @Body() dto: RiderPayoutDto,
  ) {
    return this.commandBus.execute(
      new UpsertRiderPayoutCommand(user, user.id, dto),
    );
  }

  @Roles('ADMIN', 'VENDOR', 'RIDER')
  @Get('payouts/batches')
  async listBatches(@CurrentUser() user: { id: string; role: string }) {
    if (user.role === 'ADMIN') {
      return this.prisma.payoutBatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { transfers: true },
      });
    }
    if (user.role === 'VENDOR') {
      const store = await this.prisma.store.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!store) return [];
      return this.prisma.payoutTransfer.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { batch: true },
      });
    }
    return this.prisma.payoutTransfer.findMany({
      where: { riderUserId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { batch: true },
    });
  }

  @Roles('ADMIN')
  @Post('payouts/run')
  async runPayout(@Body() dto: RunPayoutDto) {
    if (dto.party === 'RIDER') {
      return this.payouts.runRiderPayouts(dto.periodKey);
    }
    return this.payouts.runVendorPayouts(dto.periodKey);
  }
}

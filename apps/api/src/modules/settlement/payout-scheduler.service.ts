import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  PayoutBatchStatus,
  PayoutParty,
  Prisma,
  SettlementLedgerStatus,
  SettlementLedgerTxType,
} from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaystackService } from '@shared/provider/payment/paystack.service';
import { nairaToKobo } from '@shared/system/common/money';
import {
  isDuplicateTransferError,
  retryTransferRef,
  riderTransferRef,
  vendorTransferRef,
} from './payout-refs';

const MIN_PAYOUT_NGN = 100;

@Injectable()
export class PayoutSchedulerService {
  private readonly logger = new Logger(PayoutSchedulerService.name);
  private riderRunning = false;
  private vendorRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  /** Daily 01:00 Africa/Lagos ≈ 00:00 UTC (approx; use UTC cron) */
  @Cron('0 0 * * *')
  async cronRiderDaily() {
    await this.runRiderPayouts();
  }

  /** Weekly Monday 02:00 UTC */
  @Cron('0 2 * * 1')
  async cronVendorWeekly() {
    await this.runVendorPayouts();
  }

  async runRiderPayouts(forcePeriodKey?: string) {
    if (this.riderRunning) {
      return { skipped: true, reason: 'already_running' };
    }
    this.riderRunning = true;
    try {
      const now = new Date();
      const periodKey =
        forcePeriodKey ?? `rider-daily-${now.toISOString().slice(0, 10)}`;
      return await this.runPartyPayout({
        party: PayoutParty.RIDER,
        periodKey,
        periodStart: startOfUtcDay(now),
        periodEnd: now,
      });
    } finally {
      this.riderRunning = false;
    }
  }

  async runVendorPayouts(forcePeriodKey?: string) {
    if (this.vendorRunning) {
      return { skipped: true, reason: 'already_running' };
    }
    this.vendorRunning = true;
    try {
      const now = new Date();
      const week = isoWeekKey(now);
      const periodKey = forcePeriodKey ?? `vendor-weekly-${week}`;
      return await this.runPartyPayout({
        party: PayoutParty.VENDOR,
        periodKey,
        periodStart: startOfIsoWeek(now),
        periodEnd: now,
      });
    } finally {
      this.vendorRunning = false;
    }
  }

  async completeTransferByReference(
    reference: string,
    transferCode?: string,
  ) {
    const transfer = await this.prisma.payoutTransfer.findUnique({
      where: { paystackReference: reference },
    });
    if (!transfer) {
      this.logger.debug(`No payout transfer for reference ${reference}`);
      return { skipped: true, reason: 'unknown_reference' as const };
    }
    if (transfer.status === SettlementLedgerStatus.paid) {
      return { skipped: true, reason: 'already_paid' as const };
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutTransfer.updateMany({
        where: {
          id: transfer.id,
          status: {
            in: [
              SettlementLedgerStatus.pending_payout,
              SettlementLedgerStatus.failed,
            ],
          },
        },
        data: {
          status: SettlementLedgerStatus.paid,
          paystackTransferCode: transferCode,
          paidAt: new Date(),
          failureReason: null,
        },
      });
      if (claimed.count === 0) {
        return;
      }

      if (transfer.party === PayoutParty.VENDOR && transfer.storeId) {
        await this.markVendorPaid(tx, transfer);
      } else if (transfer.party === PayoutParty.RIDER && transfer.riderUserId) {
        await this.markRiderPaid(tx, transfer);
      }
    });

    await this.refreshBatchStatus(transfer.batchId);
    return { skipped: false, transferId: transfer.id };
  }

  async failTransferByReference(reference: string, reason: string) {
    const transfer = await this.prisma.payoutTransfer.findUnique({
      where: { paystackReference: reference },
    });
    if (!transfer) {
      this.logger.debug(`No payout transfer for failed ref ${reference}`);
      return { skipped: true, reason: 'unknown_reference' as const };
    }
    if (transfer.status === SettlementLedgerStatus.paid) {
      this.logger.warn(
        `Ignoring fail webhook for already-paid transfer ${reference}`,
      );
      return { skipped: true, reason: 'already_paid' as const };
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payoutTransfer.updateMany({
        where: {
          id: transfer.id,
          status: SettlementLedgerStatus.pending_payout,
        },
        data: {
          status: SettlementLedgerStatus.failed,
          failureReason: reason,
        },
      });
      if (claimed.count === 0) {
        return;
      }

      if (transfer.party === PayoutParty.VENDOR && transfer.storeId) {
        await tx.storeLedgerTx.updateMany({
          where: {
            payoutBatchId: transfer.batchId,
            storeId: transfer.storeId,
            status: SettlementLedgerStatus.pending_payout,
          },
          data: {
            status: SettlementLedgerStatus.available,
            payoutBatchId: null,
          },
        });
      } else if (transfer.party === PayoutParty.RIDER && transfer.riderUserId) {
        await tx.riderLedgerTx.updateMany({
          where: {
            payoutBatchId: transfer.batchId,
            userId: transfer.riderUserId,
            status: SettlementLedgerStatus.pending_payout,
          },
          data: {
            status: SettlementLedgerStatus.available,
            payoutBatchId: null,
          },
        });
      }
    });

    await this.refreshBatchStatus(transfer.batchId);
    return { skipped: false, transferId: transfer.id };
  }

  private async runPartyPayout(params: {
    party: PayoutParty;
    periodKey: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const existing = await this.prisma.payoutBatch.findUnique({
      where: {
        party_periodKey: {
          party: params.party,
          periodKey: params.periodKey,
        },
      },
    });
    if (existing && existing.status === PayoutBatchStatus.completed) {
      return { skipped: true, reason: 'batch_exists', batchId: existing.id };
    }

    let batch = existing;
    if (!batch) {
      try {
        batch = await this.prisma.payoutBatch.create({
          data: {
            party: params.party,
            periodKey: params.periodKey,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            status: PayoutBatchStatus.processing,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          batch = await this.prisma.payoutBatch.findUniqueOrThrow({
            where: {
              party_periodKey: {
                party: params.party,
                periodKey: params.periodKey,
              },
            },
          });
        } else {
          throw err;
        }
      }
    }

    if (batch.status === PayoutBatchStatus.completed) {
      return { skipped: true, reason: 'batch_exists', batchId: batch.id };
    }

    if (batch.status !== PayoutBatchStatus.processing) {
      await this.prisma.payoutBatch.update({
        where: { id: batch.id },
        data: { status: PayoutBatchStatus.processing, completedAt: null },
      });
    }

    if (params.party === PayoutParty.RIDER) {
      return this.payRiders(batch.id);
    }
    return this.payVendors(batch.id);
  }

  private async payVendors(batchId: string) {
    const wallets = await this.prisma.storeWallet.findMany({
      where: { balance: { gte: MIN_PAYOUT_NGN } },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            paystackRecipientCode: true,
          },
        },
        transactions: {
          where: {
            amount: { gt: 0 },
            OR: [
              { status: SettlementLedgerStatus.available },
              {
                status: SettlementLedgerStatus.pending_payout,
                payoutBatchId: batchId,
              },
            ],
          },
        },
      },
    });

    for (const wallet of wallets) {
      const recipient = wallet.store.paystackRecipientCode;
      if (!recipient) {
        this.logger.warn(`Store ${wallet.storeId} missing recipient — skip`);
        continue;
      }

      const availableTxs = wallet.transactions.filter(
        (tx) => tx.status === SettlementLedgerStatus.available,
      );
      const pendingTxs = wallet.transactions.filter(
        (tx) => tx.status === SettlementLedgerStatus.pending_payout,
      );

      const existingTransfer = await this.prisma.payoutTransfer.findFirst({
        where: { batchId, storeId: wallet.storeId },
      });

      if (existingTransfer?.status === SettlementLedgerStatus.paid) {
        continue;
      }

      if (existingTransfer?.status === SettlementLedgerStatus.pending_payout) {
        await this.initiateExistingTransfer(
          existingTransfer,
          recipient,
          `Jebbs Deli vendor payout ${wallet.store.name}`,
        );
        continue;
      }

      const toClaim = availableTxs.length > 0 ? availableTxs : pendingTxs;
      if (toClaim.length === 0) continue;

      const amount = toClaim.reduce(
        (sum, tx) => sum.add(tx.amount),
        new Prisma.Decimal(0),
      );
      if (amount.lt(MIN_PAYOUT_NGN)) continue;

      if (availableTxs.length > 0) {
        const claimed = await this.prisma.storeLedgerTx.updateMany({
          where: {
            id: { in: availableTxs.map((t) => t.id) },
            status: SettlementLedgerStatus.available,
          },
          data: {
            status: SettlementLedgerStatus.pending_payout,
            payoutBatchId: batchId,
          },
        });
        if (claimed.count === 0 && pendingTxs.length === 0) continue;
      }

      const baseRef = vendorTransferRef(batchId, wallet.storeId);
      const reference =
        existingTransfer?.status === SettlementLedgerStatus.failed
          ? retryTransferRef(baseRef)
          : (existingTransfer?.paystackReference ?? baseRef);

      const transferRow =
        existingTransfer ??
        (await this.createTransferSafe({
          batchId,
          party: PayoutParty.VENDOR,
          storeId: wallet.storeId,
          recipientCode: recipient,
          amount,
          reference,
        }));

      if (existingTransfer?.status === SettlementLedgerStatus.failed) {
        await this.prisma.payoutTransfer.update({
          where: { id: existingTransfer.id },
          data: {
            status: SettlementLedgerStatus.pending_payout,
            recipientCode: recipient,
            amount,
            paystackReference: reference,
            failureReason: null,
          },
        });
      }

      await this.initiateExistingTransfer(
        { ...transferRow, paystackReference: reference, amount },
        recipient,
        `Jebbs Deli vendor payout ${wallet.store.name}`,
      );
    }

    return this.refreshBatchStatus(batchId);
  }

  private async payRiders(batchId: string) {
    const wallets = await this.prisma.riderWallet.findMany({
      where: { balance: { gte: MIN_PAYOUT_NGN } },
      include: {
        user: {
          include: {
            riderProfile: { select: { paystackRecipientCode: true } },
          },
        },
        transactions: {
          where: {
            amount: { gt: 0 },
            OR: [
              { status: SettlementLedgerStatus.available },
              {
                status: SettlementLedgerStatus.pending_payout,
                payoutBatchId: batchId,
              },
            ],
          },
        },
      },
    });

    for (const wallet of wallets) {
      const recipient = wallet.user.riderProfile?.paystackRecipientCode;
      if (!recipient) {
        this.logger.warn(`Rider ${wallet.userId} missing recipient — skip`);
        continue;
      }

      const availableTxs = wallet.transactions.filter(
        (tx) => tx.status === SettlementLedgerStatus.available,
      );
      const pendingTxs = wallet.transactions.filter(
        (tx) => tx.status === SettlementLedgerStatus.pending_payout,
      );

      const existingTransfer = await this.prisma.payoutTransfer.findFirst({
        where: { batchId, riderUserId: wallet.userId },
      });

      if (existingTransfer?.status === SettlementLedgerStatus.paid) {
        continue;
      }

      if (existingTransfer?.status === SettlementLedgerStatus.pending_payout) {
        await this.initiateExistingTransfer(
          existingTransfer,
          recipient,
          'Jebbs Deli rider payout',
        );
        continue;
      }

      const toClaim = availableTxs.length > 0 ? availableTxs : pendingTxs;
      if (toClaim.length === 0) continue;

      const amount = toClaim.reduce(
        (sum, tx) => sum.add(tx.amount),
        new Prisma.Decimal(0),
      );
      if (amount.lt(MIN_PAYOUT_NGN)) continue;

      if (availableTxs.length > 0) {
        const claimed = await this.prisma.riderLedgerTx.updateMany({
          where: {
            id: { in: availableTxs.map((t) => t.id) },
            status: SettlementLedgerStatus.available,
          },
          data: {
            status: SettlementLedgerStatus.pending_payout,
            payoutBatchId: batchId,
          },
        });
        if (claimed.count === 0 && pendingTxs.length === 0) continue;
      }

      const baseRef = riderTransferRef(batchId, wallet.userId);
      const reference =
        existingTransfer?.status === SettlementLedgerStatus.failed
          ? retryTransferRef(baseRef)
          : (existingTransfer?.paystackReference ?? baseRef);

      const transferRow =
        existingTransfer ??
        (await this.createTransferSafe({
          batchId,
          party: PayoutParty.RIDER,
          riderUserId: wallet.userId,
          recipientCode: recipient,
          amount,
          reference,
        }));

      if (existingTransfer?.status === SettlementLedgerStatus.failed) {
        await this.prisma.payoutTransfer.update({
          where: { id: existingTransfer.id },
          data: {
            status: SettlementLedgerStatus.pending_payout,
            recipientCode: recipient,
            amount,
            paystackReference: reference,
            failureReason: null,
          },
        });
      }

      await this.initiateExistingTransfer(
        { ...transferRow, paystackReference: reference, amount },
        recipient,
        'Jebbs Deli rider payout',
      );
    }

    return this.refreshBatchStatus(batchId);
  }

  private async createTransferSafe(data: {
    batchId: string;
    party: PayoutParty;
    storeId?: string;
    riderUserId?: string;
    recipientCode: string;
    amount: Prisma.Decimal;
    reference: string;
  }) {
    try {
      return await this.prisma.payoutTransfer.create({
        data: {
          batchId: data.batchId,
          party: data.party,
          storeId: data.storeId,
          riderUserId: data.riderUserId,
          recipientCode: data.recipientCode,
          amount: data.amount,
          status: SettlementLedgerStatus.pending_payout,
          paystackReference: data.reference,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.payoutTransfer.findUnique({
          where: { paystackReference: data.reference },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  private async initiateExistingTransfer(
    transfer: {
      id: string;
      amount: Prisma.Decimal;
      paystackReference: string | null;
    },
    recipient: string,
    reason: string,
  ) {
    const reference = transfer.paystackReference;
    if (!reference) {
      this.logger.error(`Transfer ${transfer.id} missing Paystack reference`);
      return;
    }

    try {
      const result = await this.paystack.initiateTransfer({
        amount: nairaToKobo(transfer.amount.toString()),
        recipient,
        reference,
        reason,
      });
      await this.prisma.payoutTransfer.update({
        where: { id: transfer.id },
        data: {
          paystackTransferCode: result.transferCode,
        },
      });
    } catch (err) {
      if (isDuplicateTransferError(err)) {
        this.logger.debug(`Transfer ${reference} already initiated`);
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Payout initiate failed ref=${reference}: ${message}`);
      await this.prisma.payoutTransfer.update({
        where: { id: transfer.id },
        data: { failureReason: message },
      });
    }
  }

  private async markVendorPaid(
    tx: Prisma.TransactionClient,
    transfer: {
      id: string;
      batchId: string;
      storeId: string | null;
      amount: Prisma.Decimal;
      paystackReference: string | null;
    },
  ) {
    if (!transfer.storeId) return;

    await tx.storeLedgerTx.updateMany({
      where: {
        payoutBatchId: transfer.batchId,
        storeId: transfer.storeId,
        status: SettlementLedgerStatus.pending_payout,
      },
      data: { status: SettlementLedgerStatus.paid },
    });

    const wallet = await tx.storeWallet.findUnique({
      where: { storeId: transfer.storeId },
    });
    if (!wallet) {
      throw new Error(`Store wallet missing for ${transfer.storeId}`);
    }

    const decremented = await tx.storeWallet.updateMany({
      where: { id: wallet.id, balance: { gte: transfer.amount } },
      data: { balance: { decrement: transfer.amount } },
    });
    if (decremented.count === 0) {
      throw new Error(
        `Insufficient store wallet for payout ${transfer.paystackReference}`,
      );
    }
    const updatedWallet = await tx.storeWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    const payoutRef = `payout_${transfer.paystackReference}`;
    const existingPayout = await tx.storeLedgerTx.findUnique({
      where: { reference: payoutRef },
    });
    if (!existingPayout) {
      await tx.storeLedgerTx.create({
        data: {
          storeId: transfer.storeId,
          walletId: wallet.id,
          type: SettlementLedgerTxType.payout,
          amount: transfer.amount.negated(),
          balanceAfter: updatedWallet.balance,
          status: SettlementLedgerStatus.paid,
          reference: payoutRef,
          payoutBatchId: transfer.batchId,
          description: 'Scheduled vendor payout',
        },
      });
    }
  }

  private async markRiderPaid(
    tx: Prisma.TransactionClient,
    transfer: {
      id: string;
      batchId: string;
      riderUserId: string | null;
      amount: Prisma.Decimal;
      paystackReference: string | null;
    },
  ) {
    if (!transfer.riderUserId) return;

    await tx.riderLedgerTx.updateMany({
      where: {
        payoutBatchId: transfer.batchId,
        userId: transfer.riderUserId,
        status: SettlementLedgerStatus.pending_payout,
      },
      data: { status: SettlementLedgerStatus.paid },
    });

    const wallet = await tx.riderWallet.findUnique({
      where: { userId: transfer.riderUserId },
    });
    if (!wallet) {
      throw new Error(`Rider wallet missing for ${transfer.riderUserId}`);
    }

    const decremented = await tx.riderWallet.updateMany({
      where: { id: wallet.id, balance: { gte: transfer.amount } },
      data: { balance: { decrement: transfer.amount } },
    });
    if (decremented.count === 0) {
      throw new Error(
        `Insufficient rider wallet for payout ${transfer.paystackReference}`,
      );
    }
    const updatedWallet = await tx.riderWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    const payoutRef = `payout_${transfer.paystackReference}`;
    const existingPayout = await tx.riderLedgerTx.findUnique({
      where: { reference: payoutRef },
    });
    if (!existingPayout) {
      await tx.riderLedgerTx.create({
        data: {
          userId: transfer.riderUserId,
          walletId: wallet.id,
          type: SettlementLedgerTxType.payout,
          amount: transfer.amount.negated(),
          balanceAfter: updatedWallet.balance,
          status: SettlementLedgerStatus.paid,
          reference: payoutRef,
          payoutBatchId: transfer.batchId,
          description: 'Scheduled rider payout',
        },
      });
    }
  }

  private async refreshBatchStatus(batchId: string) {
    const transfers = await this.prisma.payoutTransfer.findMany({
      where: { batchId },
    });
    const success = transfers.filter(
      (t) => t.status === SettlementLedgerStatus.paid,
    ).length;
    const failure = transfers.filter(
      (t) => t.status === SettlementLedgerStatus.failed,
    ).length;
    const pending = transfers.filter(
      (t) => t.status === SettlementLedgerStatus.pending_payout,
    ).length;
    const total = transfers.reduce(
      (sum, t) => sum.add(t.amount),
      new Prisma.Decimal(0),
    );

    let status: PayoutBatchStatus;
    if (pending > 0) {
      status =
        failure > 0 ? PayoutBatchStatus.partial : PayoutBatchStatus.processing;
    } else if (failure === 0) {
      status = PayoutBatchStatus.completed;
    } else if (success > 0) {
      status = PayoutBatchStatus.partial;
    } else {
      status = PayoutBatchStatus.failed;
    }

    const batch = await this.prisma.payoutBatch.update({
      where: { id: batchId },
      data: {
        status,
        totalAmount: total,
        transferCount: transfers.length,
        successCount: success,
        failureCount: failure,
        completedAt:
          status === PayoutBatchStatus.processing ? null : new Date(),
      },
      include: { transfers: true },
    });

    this.logger.log(
      `Payout batch ${batchId} ${status}: success=${success} failure=${failure} pending=${pending} total=${total}`,
    );
    return { skipped: false, batch };
  }
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfIsoWeek(d: Date) {
  const day = d.getUTCDay() || 7;
  const start = startOfUtcDay(d);
  start.setUTCDate(start.getUTCDate() - (day - 1));
  return start;
}

function isoWeekKey(d: Date) {
  const start = startOfIsoWeek(d);
  const y = start.getUTCFullYear();
  const oneJan = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(
    ((start.getTime() - oneJan.getTime()) / 86400000 + oneJan.getUTCDay() + 1) /
      7,
  );
  return `${y}-W${String(week).padStart(2, '0')}`;
}

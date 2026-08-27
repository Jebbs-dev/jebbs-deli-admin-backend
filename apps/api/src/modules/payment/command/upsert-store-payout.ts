import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StorePayoutStatus } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaystackService } from '@shared/provider/payment/paystack.service';

export class UpsertStorePayoutCommand {
  constructor(
    public readonly storeId: string,
    public readonly actor: { id: string; role: string },
    public readonly data: {
      bankCode: string;
      bankName?: string;
      accountNumber: string;
      commissionPercent?: number;
    },
  ) {}
}

@CommandHandler(UpsertStorePayoutCommand)
export class UpsertStorePayoutHandler
  implements ICommandHandler<UpsertStorePayoutCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  async execute(command: UpsertStorePayoutCommand) {
    const store = await this.prisma.store.findUnique({
      where: { id: command.storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    if (command.actor.role === 'VENDOR' && store.userId !== command.actor.id) {
      throw new ForbiddenException('Not your store');
    }
    if (command.actor.role !== 'ADMIN' && command.actor.role !== 'VENDOR') {
      throw new ForbiddenException('Not allowed');
    }

    const resolved = await this.paystackService.resolveAccountNumber(
      command.data.accountNumber,
      command.data.bankCode,
    );

    let subaccountCode = store.paystackSubaccountCode;
    try {
      if (subaccountCode) {
        const updated = await this.paystackService.updateSubaccount(
          subaccountCode,
          {
            business_name: store.name,
            settlement_bank: command.data.bankCode,
            account_number: command.data.accountNumber,
            percentage_charge: 0,
            primary_contact_email: store.email,
            primary_contact_name: store.name,
            primary_contact_phone: store.telephone ?? undefined,
          },
        );
        subaccountCode = updated.subaccountCode;
      } else {
        const created = await this.paystackService.createSubaccount({
          business_name: store.name,
          settlement_bank: command.data.bankCode,
          account_number: command.data.accountNumber,
          percentage_charge: 0,
          description: `Jebbs Deli store ${store.name}`,
          primary_contact_email: store.email,
          primary_contact_name: store.name,
          primary_contact_phone: store.telephone ?? undefined,
        });
        subaccountCode = created.subaccountCode;
      }
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Paystack subaccount failed',
      );
    }

    let recipientCode: string;
    try {
      const recipient = await this.paystackService.createTransferRecipient({
        name: resolved.accountName || store.name,
        account_number: command.data.accountNumber,
        bank_code: command.data.bankCode,
      });
      recipientCode = recipient.recipientCode;
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error
          ? err.message
          : 'Paystack transfer recipient failed',
      );
    }

    const commissionPercent =
      command.actor.role === 'ADMIN' &&
      command.data.commissionPercent !== undefined
        ? command.data.commissionPercent
        : undefined;

    return this.prisma.store.update({
      where: { id: store.id },
      data: {
        bankCode: command.data.bankCode,
        bankName: command.data.bankName,
        accountNumber: command.data.accountNumber,
        accountName: resolved.accountName,
        paystackSubaccountCode: subaccountCode,
        paystackSubaccountStatus: StorePayoutStatus.verified,
        paystackRecipientCode: recipientCode,
        ...(commissionPercent !== undefined
          ? { commissionPercent }
          : {}),
      },
      select: {
        id: true,
        name: true,
        bankCode: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        paystackSubaccountCode: true,
        paystackSubaccountStatus: true,
        paystackRecipientCode: true,
        commissionPercent: true,
      },
    });
  }
}

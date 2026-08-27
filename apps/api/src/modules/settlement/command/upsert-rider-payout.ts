import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';
import { PaystackService } from '@shared/provider/payment/paystack.service';

export class UpsertRiderPayoutCommand {
  constructor(
    public readonly actor: { id: string; role: string },
    public readonly riderUserId: string,
    public readonly data: {
      bankCode: string;
      bankName?: string;
      accountNumber: string;
    },
  ) {}
}

@CommandHandler(UpsertRiderPayoutCommand)
export class UpsertRiderPayoutHandler
  implements ICommandHandler<UpsertRiderPayoutCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async execute(command: UpsertRiderPayoutCommand) {
    if (
      command.actor.role !== 'ADMIN' &&
      !(command.actor.role === 'RIDER' && command.actor.id === command.riderUserId)
    ) {
      throw new ForbiddenException('Not allowed');
    }

    const rider = await this.prisma.user.findFirst({
      where: { id: command.riderUserId, role: Role.RIDER },
      include: { riderProfile: true },
    });
    if (!rider?.riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }

    const resolved = await this.paystack.resolveAccountNumber(
      command.data.accountNumber,
      command.data.bankCode,
    );

    const recipient = await this.paystack.createTransferRecipient({
      name: resolved.accountName || rider.name || 'Rider',
      account_number: command.data.accountNumber,
      bank_code: command.data.bankCode,
    });

    return this.prisma.riderProfile.update({
      where: { userId: rider.id },
      data: {
        bankCode: command.data.bankCode,
        bankName: command.data.bankName,
        accountNumber: command.data.accountNumber,
        accountName: resolved.accountName,
        paystackRecipientCode: recipient.recipientCode,
      },
    });
  }
}

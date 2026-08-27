import { Injectable } from '@nestjs/common';
import {
  ChargeBeneficiary,
  FulfillmentType,
  OrderChargeType,
  Prisma,
  SurgeType,
} from '@generated/prisma/client';

/** Platform service fee as fraction of food subtotal */
export const SERVICE_FEE_RATE = 0.1;
/** Rider share of platform delivery fee (0–100) */
export const RIDER_DELIVERY_SHARE_PERCENT = 100;

export type FeeChargeLine = {
  type: OrderChargeType;
  amount: Prisma.Decimal;
  beneficiary: ChargeBeneficiary;
  commissionable: boolean;
};

export type FeeQuote = {
  subTotal: Prisma.Decimal;
  serviceFee: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  bagFee: Prisma.Decimal;
  surgeFee: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  vendorCommission: Prisma.Decimal;
  vendorPayout: Prisma.Decimal;
  platformServiceFee: Prisma.Decimal;
  platformDeliveryFee: Prisma.Decimal;
  charges: FeeChargeLine[];
};

export type StoreFeeConfig = {
  deliveryFee: number | string | Prisma.Decimal;
  commissionPercent: number | string | Prisma.Decimal;
  bagFeeEnabled: boolean;
  bagFeeAmount: number | string | Prisma.Decimal;
  bagCommissionable: boolean;
  surgeEnabled: boolean;
  surgeType: SurgeType;
  surgeValue: number | string | Prisma.Decimal;
};

@Injectable()
export class FeeEngineService {
  compute(params: {
    subTotal: number | string | Prisma.Decimal;
    fulfillmentType: FulfillmentType;
    store: StoreFeeConfig;
  }): FeeQuote {
    const subTotal = new Prisma.Decimal(params.subTotal).toDecimalPlaces(2);
    const isDelivery = params.fulfillmentType === FulfillmentType.delivery;

    const deliveryFee = isDelivery
      ? new Prisma.Decimal(params.store.deliveryFee).toDecimalPlaces(2)
      : new Prisma.Decimal(0);

    const serviceFee = subTotal.mul(SERVICE_FEE_RATE).toDecimalPlaces(2);

    const bagFee =
      isDelivery && params.store.bagFeeEnabled
        ? new Prisma.Decimal(params.store.bagFeeAmount).toDecimalPlaces(2)
        : new Prisma.Decimal(0);

    let surgeFee = new Prisma.Decimal(0);
    if (isDelivery && params.store.surgeEnabled) {
      const surgeValue = new Prisma.Decimal(params.store.surgeValue);
      if (params.store.surgeType === SurgeType.percent) {
        surgeFee = subTotal.mul(surgeValue.div(100)).toDecimalPlaces(2);
      } else {
        surgeFee = surgeValue.toDecimalPlaces(2);
      }
    }

    const charges: FeeChargeLine[] = [
      {
        type: OrderChargeType.SERVICE_FEE,
        amount: serviceFee,
        beneficiary: ChargeBeneficiary.PLATFORM,
        commissionable: false,
      },
    ];

    if (deliveryFee.gt(0)) {
      charges.push({
        type: OrderChargeType.DELIVERY_FEE,
        amount: deliveryFee,
        beneficiary: ChargeBeneficiary.LOGISTICS,
        commissionable: false,
      });
    }

    if (bagFee.gt(0)) {
      charges.push({
        type: OrderChargeType.BAG_FEE,
        amount: bagFee,
        beneficiary: ChargeBeneficiary.VENDOR,
        commissionable: params.store.bagCommissionable,
      });
    }

    if (surgeFee.gt(0)) {
      charges.push({
        type: OrderChargeType.SURGE_FEE,
        amount: surgeFee,
        beneficiary: ChargeBeneficiary.PLATFORM,
        commissionable: false,
      });
    }

    // Commissionable vendor base = food subtotal + commissionable bag
    let commissionableVendor = subTotal;
    if (bagFee.gt(0) && params.store.bagCommissionable) {
      commissionableVendor = commissionableVendor.add(bagFee);
    }

    const commissionRate = new Prisma.Decimal(params.store.commissionPercent)
      .div(100)
      .toDecimalPlaces(4);
    const vendorCommission = commissionableVendor
      .mul(commissionRate)
      .toDecimalPlaces(2);

    // Vendor payout = subtotal - commission + bag (bag already in commissionable if flagged)
    let vendorPayout = subTotal.sub(vendorCommission);
    if (bagFee.gt(0)) {
      if (params.store.bagCommissionable) {
        // bag was in commissionable base; vendor keeps bag net of its share of commission
        // commission already taken from bag+food; add full bag then subtract already-included portion of commission
        // Simpler: vendor gets (subTotal + bag) - vendorCommission
        vendorPayout = subTotal.add(bagFee).sub(vendorCommission);
      } else {
        vendorPayout = vendorPayout.add(bagFee);
      }
    }
    vendorPayout = vendorPayout.toDecimalPlaces(2);

    const totalPrice = subTotal
      .add(serviceFee)
      .add(deliveryFee)
      .add(bagFee)
      .add(surgeFee)
      .toDecimalPlaces(2);

    return {
      subTotal,
      serviceFee,
      deliveryFee,
      bagFee,
      surgeFee,
      totalPrice,
      vendorCommission,
      vendorPayout,
      platformServiceFee: serviceFee,
      platformDeliveryFee: deliveryFee,
      charges,
    };
  }

  riderShareOfDelivery(platformDeliveryFee: Prisma.Decimal | number | string) {
    const fee = new Prisma.Decimal(platformDeliveryFee);
    return fee
      .mul(RIDER_DELIVERY_SHARE_PERCENT)
      .div(100)
      .toDecimalPlaces(2);
  }
}

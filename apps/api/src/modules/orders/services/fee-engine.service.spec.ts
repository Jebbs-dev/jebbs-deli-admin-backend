import { describe, expect, it } from 'vitest';
import {
  FulfillmentType,
  SurgeType,
} from '@generated/prisma/client';
import { Prisma } from '@generated/prisma/client';
import {
  FeeEngineService,
  SERVICE_FEE_RATE,
} from './fee-engine.service';

const baseStore = {
  deliveryFee: 500,
  commissionPercent: 10,
  bagFeeEnabled: false,
  bagFeeAmount: 0,
  bagCommissionable: false,
  surgeEnabled: false,
  surgeType: SurgeType.flat,
  surgeValue: 0,
};

describe('FeeEngineService', () => {
  const engine = new FeeEngineService();

  it('quotes pickup without delivery, bag, or surge', () => {
    const quote = engine.compute({
      subTotal: 2000,
      fulfillmentType: FulfillmentType.pickup,
      store: { ...baseStore, bagFeeEnabled: true, bagFeeAmount: 50, surgeEnabled: true, surgeValue: 100 },
    });

    expect(quote.subTotal.toFixed(2)).toBe('2000.00');
    expect(quote.serviceFee.toFixed(2)).toBe('200.00');
    expect(quote.deliveryFee.toFixed(2)).toBe('0.00');
    expect(quote.bagFee.toFixed(2)).toBe('0.00');
    expect(quote.surgeFee.toFixed(2)).toBe('0.00');
    expect(quote.totalPrice.toFixed(2)).toBe('2200.00');
    expect(quote.vendorCommission.toFixed(2)).toBe('200.00');
    expect(quote.vendorPayout.toFixed(2)).toBe('1800.00');
  });

  it('adds delivery fee and a non-commissionable bag on delivery', () => {
    const quote = engine.compute({
      subTotal: 1000,
      fulfillmentType: FulfillmentType.delivery,
      store: {
        ...baseStore,
        bagFeeEnabled: true,
        bagFeeAmount: 50,
        bagCommissionable: false,
      },
    });

    expect(quote.deliveryFee.toFixed(2)).toBe('500.00');
    expect(quote.bagFee.toFixed(2)).toBe('50.00');
    expect(quote.serviceFee.toFixed(2)).toBe(
      new Prisma.Decimal(1000).mul(SERVICE_FEE_RATE).toDecimalPlaces(2).toFixed(2),
    );
    expect(quote.vendorCommission.toFixed(2)).toBe('100.00');
    expect(quote.vendorPayout.toFixed(2)).toBe('950.00');
    expect(quote.totalPrice.toFixed(2)).toBe('1650.00');
  });

  it('takes commission from bag when bag is commissionable', () => {
    const quote = engine.compute({
      subTotal: 1000,
      fulfillmentType: FulfillmentType.delivery,
      store: {
        ...baseStore,
        bagFeeEnabled: true,
        bagFeeAmount: 50,
        bagCommissionable: true,
      },
    });

    expect(quote.vendorCommission.toFixed(2)).toBe('105.00');
    expect(quote.vendorPayout.toFixed(2)).toBe('945.00');
  });

  it('applies percent surge on delivery subtotal', () => {
    const quote = engine.compute({
      subTotal: 2000,
      fulfillmentType: FulfillmentType.delivery,
      store: {
        ...baseStore,
        surgeEnabled: true,
        surgeType: SurgeType.percent,
        surgeValue: 10,
      },
    });

    expect(quote.surgeFee.toFixed(2)).toBe('200.00');
    expect(quote.totalPrice.toFixed(2)).toBe('2900.00');
  });

  it('pays the rider the full platform delivery fee', () => {
    expect(engine.riderShareOfDelivery(500).toFixed(2)).toBe('500.00');
  });
});

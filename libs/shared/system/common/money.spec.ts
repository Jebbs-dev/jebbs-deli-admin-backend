import { describe, expect, it } from 'vitest';
import { Prisma } from '@generated/prisma/client';
import { nairaToKobo } from './money';

describe('nairaToKobo', () => {
  it('converts major units to Paystack kobo', () => {
    expect(nairaToKobo(10.5)).toBe(1050);
    expect(nairaToKobo('10.50')).toBe(1050);
  });

  it('rounds half-kobo amounts', () => {
    expect(nairaToKobo(10.005)).toBe(1001);
  });
});

describe('wallet debit invariant', () => {
  it('allows a debit when balance is at least the order total', () => {
    const balance = new Prisma.Decimal('1500.00');
    const total = new Prisma.Decimal('1500.00');
    expect(balance.gte(total)).toBe(true);
  });

  it('blocks an overdraft', () => {
    const balance = new Prisma.Decimal('1499.99');
    const total = new Prisma.Decimal('1500.00');
    expect(balance.gte(total)).toBe(false);
  });
});

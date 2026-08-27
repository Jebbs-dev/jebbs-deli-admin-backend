import { describe, expect, it } from 'vitest';
import { productWithPublicStoreInclude, storePublicOmit } from './safe-selects';
import {
  orderListQuerySchema,
  productListQuerySchema,
  storeListQuerySchema,
} from './dto/list-query.dto';
import {
  lagosDayRange,
  lagosStartOfDay,
  orderListWhere,
  productListWhere,
  storeListWhere,
} from './list-query';

describe('productListQuerySchema', () => {
  it('treats empty strings as unset', () => {
    const parsed = productListQuerySchema.parse({
      q: '',
      category: '',
      createdFrom: '',
      search: '',
      startDate: '',
      endDate: '',
    });
    expect(parsed.q).toBeUndefined();
    expect(parsed.category).toBeUndefined();
    expect(parsed.createdFrom).toBeUndefined();
  });

  it('maps legacy search/startDate/isFeatured onto q/createdFrom/featured', () => {
    const parsed = productListQuerySchema.parse({
      search: 'jollof',
      startDate: '2026-08-01',
      endDate: '2026-08-27',
      isFeatured: 'true',
      sortBy: 'name',
      sortOrder: 'asc',
      limit: '10',
    });
    expect(parsed.q).toBe('jollof');
    expect(parsed.createdFrom).toBe('2026-08-01');
    expect(parsed.createdTo).toBe('2026-08-27');
    expect(parsed.featured).toBe(true);
    expect(parsed.sort).toBe('name:asc');
    expect(parsed.limit).toBe(10);
  });

  it('does not treat free-text q as a category enum', () => {
    const parsed = productListQuerySchema.parse({ q: 'meal' });
    expect(parsed.q).toBe('meal');
    expect(parsed.category).toBeUndefined();
    const where = productListWhere(parsed, { catalogOnly: true });
    expect(where.OR).toEqual([
      { name: { contains: 'meal', mode: 'insensitive' } },
      { description: { contains: 'meal', mode: 'insensitive' } },
    ]);
    expect(where.category).toBeUndefined();
  });

  it('parses csv category and rejects unknown values', () => {
    expect(
      productListQuerySchema.parse({ category: 'meal,drink' }).category,
    ).toEqual(['meal', 'drink']);
    expect(() => productListQuerySchema.parse({ category: 'soup' })).toThrow();
  });

  it('does not coerce available=false to true', () => {
    expect(productListQuerySchema.parse({ available: 'false' }).available).toBe(
      false,
    );
    expect(productListQuerySchema.parse({ available: 'true' }).available).toBe(
      true,
    );
  });
});

describe('productListWhere', () => {
  it('forces isAvailable on public catalog even when available=false', () => {
    const parsed = productListQuerySchema.parse({ available: 'false' });
    expect(
      productListWhere(parsed, { storeId: 's1', catalogOnly: true }).isAvailable,
    ).toBe(true);
  });

  it('lets staff filter unavailable products', () => {
    const parsed = productListQuerySchema.parse({ available: 'false' });
    expect(
      productListWhere(parsed, { storeId: 's1', catalogOnly: false }).isAvailable,
    ).toBe(false);
  });
});

describe('orderListQuerySchema', () => {
  it('maps legacy search=paid to status, not q', () => {
    const parsed = orderListQuerySchema.parse({ search: 'paid' });
    expect(parsed.status).toEqual(['paid']);
    expect(parsed.q).toBeUndefined();
    expect(orderListWhere(parsed, { storeId: 's1' })).toMatchObject({
      storeId: 's1',
      status: { in: ['paid'] },
    });
  });

  it('keeps free-text q on name/email/address fields', () => {
    const parsed = orderListQuerySchema.parse({ q: 'funmi' });
    expect(parsed.q).toBe('funmi');
    expect(parsed.status).toBeUndefined();
    const where = orderListWhere(parsed, {});
    expect(where.OR?.[0]).toEqual({ id: { startsWith: 'funmi' } });
  });
});

describe('storeListWhere', () => {
  it('filters inactive stores from the public list', () => {
    const parsed = storeListQuerySchema.parse({});
    expect(storeListWhere(parsed, { includeInactive: false }).isActive).toBe(
      true,
    );
    expect(
      storeListWhere(parsed, { includeInactive: true }).isActive,
    ).toBeUndefined();
  });
});

describe('lagosDayRange', () => {
  it('uses a half-open interval in Africa/Lagos', () => {
    const range = lagosDayRange('2026-08-27', '2026-08-27');
    expect(range?.gte).toEqual(lagosStartOfDay('2026-08-27'));
    expect(range?.lt).toEqual(lagosStartOfDay('2026-08-28'));
    expect(range?.gte?.toISOString()).toBe('2026-08-26T23:00:00.000Z');
    expect(range?.lt?.toISOString()).toBe('2026-08-27T23:00:00.000Z');
  });
});

describe('productWithPublicStoreInclude', () => {
  it('omits payout fields from nested store', () => {
    expect(productWithPublicStoreInclude.store.omit).toEqual(storePublicOmit);
    expect(storePublicOmit.accountNumber).toBe(true);
    expect(storePublicOmit.paystackRecipientCode).toBe(true);
  });
});

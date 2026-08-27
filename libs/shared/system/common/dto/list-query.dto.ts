import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/** Keep in sync with prisma `Category`. */
export const PRODUCT_CATEGORIES = [
  'meal',
  'drink',
  'snack',
  'dessert',
  'sides',
  'small_chops',
  'chicken',
  'pizza',
  'burger',
] as const;

/** Keep in sync with prisma `OrderStatus`. */
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled',
  'failed',
] as const;

export const emptyToUndef = (v: unknown) =>
  v === '' || v === null || v === undefined ? undefined : v;

function firstQueryValue(v: unknown): unknown {
  return Array.isArray(v) ? v[0] : v;
}

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => {
    if (v === '' || v == null) return undefined;
    const parts = (Array.isArray(v) ? v : String(v).split(','))
      .map((x) => String(x).trim())
      .filter(Boolean);
    return parts.length ? parts : undefined;
  }, z.array(z.enum(values)).min(1).optional());

const boolQuery = z.preprocess((v) => {
  const x = emptyToUndef(firstQueryValue(v));
  if (x === undefined) return undefined;
  if (x === true || x === 'true' || x === '1') return true;
  if (x === false || x === 'false' || x === '0') return false;
  return x;
}, z.boolean().optional());

const isoDateQuery = z.preprocess(
  (v) => emptyToUndef(firstQueryValue(v)),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional(),
);

const trimmedQ = z.preprocess((v) => {
  const x = emptyToUndef(firstQueryValue(v));
  if (typeof x !== 'string') return x;
  const t = x.trim();
  return t === '' ? undefined : t;
}, z.string().min(1).max(80).optional());

export const listPageSchema = z.object({
  limit: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.coerce.number().int().min(1).max(100).optional(),
  ),
  offset: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.coerce.number().int().min(0).optional(),
  ),
  sort: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z
      .string()
      .regex(/^[a-zA-Z]+:(asc|desc)$/)
      .optional(),
  ),
  q: trimmedQ,
});

function applyLegacyListAliases(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const q = { ...(raw as Record<string, unknown>) };
  if (emptyToUndef(q.q) === undefined && emptyToUndef(q.search) !== undefined) {
    q.q = q.search;
  }
  if (
    emptyToUndef(q.createdFrom) === undefined &&
    emptyToUndef(q.startDate) !== undefined
  ) {
    q.createdFrom = q.startDate;
  }
  if (
    emptyToUndef(q.createdTo) === undefined &&
    emptyToUndef(q.endDate) !== undefined
  ) {
    q.createdTo = q.endDate;
  }
  if (
    emptyToUndef(q.featured) === undefined &&
    emptyToUndef(q.isFeatured) !== undefined
  ) {
    q.featured = q.isFeatured;
  }
  if (
    emptyToUndef(q.available) === undefined &&
    emptyToUndef(q.isAvailable) !== undefined
  ) {
    q.available = q.isAvailable;
  }
  if (emptyToUndef(q.sort) === undefined && emptyToUndef(q.sortBy) !== undefined) {
    const dir = q.sortOrder === 'asc' ? 'asc' : 'desc';
    q.sort = `${String(q.sortBy)}:${dir}`;
  }
  return q;
}

const productListFields = listPageSchema.extend({
  category: csvEnum(PRODUCT_CATEGORIES),
  available: boolQuery,
  featured: boolQuery,
  createdFrom: isoDateQuery,
  createdTo: isoDateQuery,
  storeId: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.string().min(1).optional(),
  ),
  sort: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z
      .string()
      .regex(/^(createdAt|name|price):(asc|desc)$/)
      .optional(),
  ),
});

export const productListQuerySchema = z.preprocess(
  applyLegacyListAliases,
  productListFields,
);

function applyOrderLegacyAliases(raw: unknown): Record<string, unknown> {
  const q = applyLegacyListAliases(raw);
  const text = emptyToUndef(q.q);
  if (
    typeof text === 'string' &&
    (ORDER_STATUSES as readonly string[]).includes(text) &&
    emptyToUndef(q.status) === undefined
  ) {
    q.status = text;
    delete q.q;
  }
  return q;
}

const orderListFields = listPageSchema.extend({
  status: csvEnum(ORDER_STATUSES),
  fulfillment: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.enum(['delivery', 'pickup']).optional(),
  ),
  createdFrom: isoDateQuery,
  createdTo: isoDateQuery,
  paidFrom: isoDateQuery,
  paidTo: isoDateQuery,
  storeId: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.string().min(1).optional(),
  ),
  userId: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z.string().min(1).optional(),
  ),
  sort: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z
      .string()
      .regex(/^(createdAt|totalPrice|status):(asc|desc)$/)
      .optional(),
  ),
});

export const orderListQuerySchema = z.preprocess(
  applyOrderLegacyAliases,
  orderListFields,
);

const storeListFields = listPageSchema.extend({
  createdFrom: isoDateQuery,
  createdTo: isoDateQuery,
  sort: z.preprocess(
    (v) => emptyToUndef(firstQueryValue(v)),
    z
      .string()
      .regex(/^(createdAt|name):(asc|desc)$/)
      .optional(),
  ),
});

export const storeListQuerySchema = z.preprocess(
  applyLegacyListAliases,
  storeListFields,
);

export class QueryProductDto extends createZodDto(productListQuerySchema) {}
export class QueryOrderDto extends createZodDto(orderListQuerySchema) {}
export class QueryStoreDto extends createZodDto(storeListQuerySchema) {}

export type ProductListQuery = z.infer<typeof productListFields>;
export type OrderListQuery = z.infer<typeof orderListFields>;
export type StoreListQuery = z.infer<typeof storeListFields>;

import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@generated/prisma/client';
import type { PaginatedResult } from './interfaces/paginated-result.interface';
import type {
  OrderListQuery,
  ProductListQuery,
  StoreListQuery,
} from './dto/list-query.dto';

const LAGOS_OFFSET = '+01:00';

export function lagosStartOfDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${LAGOS_OFFSET}`);
}

function addOneCalendarDay(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function lagosDayRange(
  from?: string,
  to?: string,
): { gte?: Date; lt?: Date } | undefined {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lt?: Date } = {};
  if (from) range.gte = lagosStartOfDay(from);
  if (to) range.lt = lagosStartOfDay(addOneCalendarDay(to));
  return range;
}

export function toPage<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    limit,
    offset,
    next: offset + limit < total,
    previous: offset > 0,
  };
}

export function parseSort(
  sort: string | undefined,
  allowlist: readonly string[],
  fallback: { field: string; dir: 'asc' | 'desc' },
): { field: string; dir: 'asc' | 'desc' } {
  if (!sort) return fallback;
  const [field, dir] = sort.split(':');
  if (!allowlist.includes(field) || (dir !== 'asc' && dir !== 'desc')) {
    throw new BadRequestException('Invalid sort');
  }
  return { field, dir };
}

export function productListWhere(
  query: ProductListQuery,
  opts: { storeId?: string; catalogOnly: boolean },
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (opts.storeId) where.storeId = opts.storeId;

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.category?.length) {
    where.category = { in: query.category };
  }
  if (opts.catalogOnly) {
    where.isAvailable = true;
  } else if (query.available !== undefined) {
    where.isAvailable = query.available;
  }
  if (query.featured !== undefined) {
    where.isFeatured = query.featured;
  }
  const createdAt = lagosDayRange(query.createdFrom, query.createdTo);
  if (createdAt) where.createdAt = createdAt;
  return where;
}

export function orderListWhere(
  query: OrderListQuery,
  opts: { storeId?: string; userId?: string },
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (opts.storeId) where.storeId = opts.storeId;
  if (opts.userId) where.userId = opts.userId;

  if (query.q) {
    where.OR = [
      { id: { startsWith: query.q } },
      { customerAddress: { contains: query.q, mode: 'insensitive' } },
      {
        user: {
          is: {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
              { telephone: { contains: query.q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }
  if (query.status?.length) {
    where.status = { in: query.status };
  }
  if (query.fulfillment) {
    where.fulfillmentType = query.fulfillment;
  }
  const createdAt = lagosDayRange(query.createdFrom, query.createdTo);
  if (createdAt) where.createdAt = createdAt;
  const paidAt = lagosDayRange(query.paidFrom, query.paidTo);
  if (paidAt) where.paidAt = paidAt;
  return where;
}

export function storeListWhere(
  query: StoreListQuery,
  opts: { includeInactive: boolean },
): Prisma.StoreWhereInput {
  const where: Prisma.StoreWhereInput = {};
  if (!opts.includeInactive) {
    where.isActive = true;
  }
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { address: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  const createdAt = lagosDayRange(query.createdFrom, query.createdTo);
  if (createdAt) where.createdAt = createdAt;
  return where;
}

export function pageLimits(query: { limit?: number; offset?: number }): {
  limit: number;
  offset: number;
} {
  return {
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
  };
}

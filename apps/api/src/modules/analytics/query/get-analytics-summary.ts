import { ForbiddenException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaymentStatus, Prisma } from '@generated/prisma/client';
import { PrismaService } from '@shared/system/database/prisma.service';

export class GetAnalyticsSummaryQuery {
  constructor(
    public readonly range: '1d' | '1w' | '1m' | '1y',
    public readonly storeId: string | undefined,
    public readonly actor: { id: string; role: string },
  ) {}
}

function rangeWindow(range: string): { start: Date; previousStart: Date } {
  const now = new Date();
  const start = new Date(now);
  const ms =
    range === '1d'
      ? 24 * 60 * 60 * 1000
      : range === '1w'
        ? 7 * 24 * 60 * 60 * 1000
        : range === '1m'
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
  start.setTime(now.getTime() - ms);
  const previousStart = new Date(start.getTime() - ms);
  return { start, previousStart };
}

function bucketKey(date: Date, range: string): string {
  if (range === '1d') {
    return `${date.getHours().toString().padStart(2, '0')}:00`;
  }
  if (range === '1y') {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
  }
  return date.toISOString().slice(0, 10);
}

@QueryHandler(GetAnalyticsSummaryQuery)
export class GetAnalyticsSummaryHandler
  implements IQueryHandler<GetAnalyticsSummaryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAnalyticsSummaryQuery) {
    let storeId = query.storeId;
    if (query.actor.role === 'VENDOR') {
      const store = await this.prisma.store.findFirst({
        where: { userId: query.actor.id },
        select: { id: true },
      });
      if (!store) throw new ForbiddenException('Vendor store required');
      storeId = store.id;
    }

    const { start, previousStart } = rangeWindow(query.range);
    const now = new Date();

    const paidFilter: Prisma.OrderWhereInput = {
      ...(storeId ? { storeId } : {}),
      OR: [
        { status: { in: ['paid', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'] } },
        { payments: { some: { status: PaymentStatus.success } } },
      ],
    };

    const [currentOrders, previousOrders, topItems] = await Promise.all([
      this.prisma.order.findMany({
        where: { ...paidFilter, createdAt: { gte: start, lte: now } },
        select: {
          id: true,
          totalPrice: true,
          subTotal: true,
          status: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: {
          ...paidFilter,
          createdAt: { gte: previousStart, lt: start },
        },
        select: { totalPrice: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: {
          order: {
            ...paidFilter,
            createdAt: { gte: start, lte: now },
          },
        },
        _sum: { quantity: true, unitPrice: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    const revenue = currentOrders.reduce(
      (sum, o) => sum + Number(o.totalPrice),
      0,
    );
    const previousRevenue = previousOrders.reduce(
      (sum, o) => sum + Number(o.totalPrice),
      0,
    );
    const deliveredCount = currentOrders.filter(
      (o) => o.status === 'delivered',
    ).length;
    const orderCount = currentOrders.length;
    const previousCount = previousOrders.length;

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const buckets = new Map<string, { label: string; value: number; count: number }>();
    for (const order of currentOrders) {
      const key = bucketKey(order.createdAt, query.range);
      const existing = buckets.get(key) ?? { label: key, value: 0, count: 0 };
      existing.value += Number(order.totalPrice);
      existing.count += 1;
      buckets.set(key, existing);
    }

    const series = Array.from(buckets.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return {
      range: query.range,
      storeId: storeId ?? null,
      summary: {
        revenue,
        orderCount,
        deliveredCount,
        averageOrderValue: orderCount ? revenue / orderCount : 0,
        revenueChangePct: pct(revenue, previousRevenue),
        orderCountChangePct: pct(orderCount, previousCount),
      },
      series,
      topProducts: topItems.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item._sum.quantity ?? 0,
        orders: item._count._all,
      })),
    };
  }
}

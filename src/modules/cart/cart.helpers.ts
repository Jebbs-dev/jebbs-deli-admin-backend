import { Prisma } from '@generated/prisma/client';

export const cartWithItemsInclude = {
  cartGroups: {
    include: {
      store: true,
      cartItems: { include: { product: true } },
    },
  },
  user: true,
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof cartWithItemsInclude;
}>;

export function computeCartTotal(
  cart: {
    cartGroups: Array<{
      cartItems: Array<{ quantity: number; product: { price: Prisma.Decimal } }>;
    }>;
  },
): Prisma.Decimal {
  let total = new Prisma.Decimal(0);
  for (const group of cart.cartGroups) {
    for (const item of group.cartItems) {
      total = total.add(item.product.price.mul(item.quantity));
    }
  }
  return total;
}

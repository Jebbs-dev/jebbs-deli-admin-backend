/** Prisma `omit` for password hashes — use on every user read/write response. */
export const userPasswordOmit = { password: true } as const;

/** Fields that must never appear on public or customer-facing store payloads. */
export const storePublicOmit = {
  bankCode: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  paystackSubaccountCode: true,
  paystackSubaccountStatus: true,
  paystackRecipientCode: true,
  commissionPercent: true,
} as const;

/** Nested Store include that strips payout secrets. */
export const storePublicInclude = { omit: storePublicOmit } as const;

/** Product → store nest used on public catalog payloads. */
export const productWithPublicStoreInclude = {
  store: storePublicInclude,
} as const;

/** Rider bank / Paystack recipient fields — never on order or rider-list payloads. */
export const riderPayoutOmit = {
  bankCode: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  paystackRecipientCode: true,
} as const;

export const riderPublicInclude = { omit: riderPayoutOmit } as const;

export const userSafeSelect = {
  id: true,
  name: true,
  email: true,
  telephone: true,
  avatar: true,
  address: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

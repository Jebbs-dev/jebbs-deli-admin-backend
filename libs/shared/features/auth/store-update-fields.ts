const VENDOR_STORE_FIELDS = new Set([
  'name',
  'email',
  'telephone',
  'address',
  'preparationTime',
  'openingTime',
  'closingTime',
  'tags',
  'deliveryFee',
  'bagFeeEnabled',
  'bagFeeAmount',
  'bagCommissionable',
  'surgeEnabled',
  'surgeType',
  'surgeValue',
  'slug',
]);

const ADMIN_ONLY_STORE_FIELDS = new Set(['isActive', 'commissionPercent']);

export function pickStoreWriteFields(
  storeData: object | undefined,
  isAdmin: boolean,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(storeData ?? {})) {
    if (value === undefined) continue;
    if (VENDOR_STORE_FIELDS.has(key)) {
      data[key] = value;
      continue;
    }
    if (isAdmin && ADMIN_ONLY_STORE_FIELDS.has(key)) {
      data[key] = value;
    }
  }
  return data;
}

export function vendorTransferRef(batchId: string, storeId: string) {
  return `po_v_${batchId}_${storeId}`;
}

export function riderTransferRef(batchId: string, userId: string) {
  return `po_r_${batchId}_${userId}`;
}

export function retryTransferRef(base: string) {
  return `${base}_r${Date.now().toString(36)}`;
}

export function isDuplicateTransferError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /already|duplicate/i.test(message);
}

import { describe, expect, it } from 'vitest';
import {
  isDuplicateTransferError,
  riderTransferRef,
  vendorTransferRef,
} from './payout-refs';

describe('payout refs', () => {
  it('builds stable vendor and rider transfer references', () => {
    expect(vendorTransferRef('batch1', 'store9')).toBe('po_v_batch1_store9');
    expect(riderTransferRef('batch1', 'user9')).toBe('po_r_batch1_user9');
  });

  it('detects Paystack duplicate-transfer errors for idempotent retries', () => {
    expect(isDuplicateTransferError(new Error('Transfer already exists'))).toBe(
      true,
    );
    expect(isDuplicateTransferError(new Error('Insufficient balance'))).toBe(
      false,
    );
  });
});

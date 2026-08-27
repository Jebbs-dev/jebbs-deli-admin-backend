import { describe, expect, it } from 'vitest';
import { pickStoreWriteFields } from './store-update-fields';

describe('pickStoreWriteFields', () => {
  const payload = {
    name: 'Jebbs',
    commissionPercent: 25,
    isActive: false,
    unknown: 'drop-me',
    deliveryFee: 400,
  };

  it('lets vendors change catalog fields but not commission or active flag', () => {
    expect(pickStoreWriteFields(payload, false)).toEqual({
      name: 'Jebbs',
      deliveryFee: 400,
    });
  });

  it('lets admins set commission and active flag', () => {
    expect(pickStoreWriteFields(payload, true)).toEqual({
      name: 'Jebbs',
      commissionPercent: 25,
      isActive: false,
      deliveryFee: 400,
    });
  });

  it('ignores undefined values', () => {
    expect(pickStoreWriteFields({ name: undefined, telephone: '080' }, false)).toEqual({
      telephone: '080',
    });
  });
});

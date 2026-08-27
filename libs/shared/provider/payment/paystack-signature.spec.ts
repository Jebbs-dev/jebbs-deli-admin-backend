import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyPaystackSignature } from './paystack-signature';

describe('verifyPaystackSignature', () => {
  const secret = 'sk_test_secret';
  const body = Buffer.from('{"event":"charge.success"}');

  it('accepts a valid HMAC-SHA512 hex signature', () => {
    const signature = createHmac('sha512', secret).update(body).digest('hex');
    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyPaystackSignature(body, 'a'.repeat(128), secret)).toBe(false);
  });

  it('rejects a length-mismatched header without throwing', () => {
    expect(verifyPaystackSignature(body, 'short', secret)).toBe(false);
  });

  it('rejects missing header or secret', () => {
    expect(verifyPaystackSignature(body, undefined, secret)).toBe(false);
    expect(verifyPaystackSignature(body, 'abc', '')).toBe(false);
  });
});

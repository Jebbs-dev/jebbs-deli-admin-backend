import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyPaystackSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secretKey: string,
): boolean {
  if (!signatureHeader || !secretKey) {
    return false;
  }
  const hash = createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const expected = Buffer.from(hash, 'utf8');
  const actual = Buffer.from(signatureHeader, 'utf8');
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

/** Convert Naira (major units) to Paystack kobo (minor units). */
export function nairaToKobo(naira: number | string): number {
  return Math.round(Number(naira) * 100);
}

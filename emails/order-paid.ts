export type OrderPaidEmailProps = {
  name?: string;
  orderId: string;
  amount: string;
  currency: string;
  reference: string;
};

/** HTML email body for successful order payment (Resend). */
export function renderOrderPaidEmail(props: OrderPaidEmailProps): {
  subject: string;
  html: string;
} {
  const name = props.name ?? 'there';
  return {
    subject: `Payment confirmed for order ${props.orderId}`,
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: Georgia, serif; background:#fff8f1; color:#1a1a1a; padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:24px;border:1px solid #f0e6da;">
      <h1 style="font-size:24px;margin:0 0 16px;">Payment confirmed</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received your payment for order <strong>${escapeHtml(props.orderId)}</strong>.</p>
      <p>Amount: <strong>${escapeHtml(props.currency)} ${escapeHtml(props.amount)}</strong></p>
      <p>Reference: <strong>${escapeHtml(props.reference)}</strong></p>
      <p>Thanks for ordering with Jebbs Deli.</p>
    </div>
  </body>
</html>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

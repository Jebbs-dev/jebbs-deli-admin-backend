import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { OrderPaidEmailProps } from './order-paid';

/** React Email preview component (`pnpm email:dev`). */
export function OrderPaidEmail({
  name = 'there',
  orderId,
  amount,
  currency,
  reference,
}: OrderPaidEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Jebbs Deli order payment was successful</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Payment confirmed</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We received your payment for order <strong>{orderId}</strong>.
          </Text>
          <Section style={box}>
            <Text style={meta}>
              Amount: {currency} {amount}
            </Text>
            <Text style={meta}>Reference: {reference}</Text>
          </Section>
          <Text style={text}>Thanks for ordering with Jebbs Deli.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderPaidEmail;

const main = {
  backgroundColor: '#fff8f1',
  fontFamily: 'Georgia, serif',
};

const container = {
  margin: '0 auto',
  padding: '24px',
  maxWidth: '520px',
  backgroundColor: '#ffffff',
  border: '1px solid #f0e6da',
};

const heading = {
  fontSize: '24px',
  margin: '0 0 16px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
};

const box = {
  margin: '16px 0',
  padding: '12px 16px',
  backgroundColor: '#fff8f1',
};

const meta = {
  fontSize: '14px',
  margin: '4px 0',
};

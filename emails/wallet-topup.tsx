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

export type WalletTopupEmailProps = {
  name?: string;
  amount: string;
  currency: string;
  balance: string;
  reference: string;
};

export function WalletTopupEmail({
  name = 'there',
  amount,
  currency,
  balance,
  reference,
}: WalletTopupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Jebbs Deli wallet top-up was successful</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Top-up confirmed</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your Jebbs Deli wallet was credited successfully.
          </Text>
          <Section style={box}>
            <Text style={meta}>
              Amount: {currency} {amount}
            </Text>
            <Text style={meta}>
              New balance: {currency} {balance}
            </Text>
            <Text style={meta}>Reference: {reference}</Text>
          </Section>
          <Text style={text}>You can now pay for orders with your wallet.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WalletTopupEmail;

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

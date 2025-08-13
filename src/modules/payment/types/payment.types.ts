export interface InitialisePaymentProps {
  email: string;
  amount: string;
  currency?: string;
  reference?: string;
  callback_url?: string;
  plan?: string;
  invoice_limit?: string;
  split_code?: string;
  channels: [
    "card",
    "bank",
    "apple_pay",
    "ussd",
    "qr",
    "mobile_money",
    "bank_transfer",
    "eft"
  ];
  subaccount?: string;
  transaction_charge?: string;
  bearer?: string;
}

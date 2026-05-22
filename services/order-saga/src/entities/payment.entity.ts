export type PaymentStatus = "PENDING" | "AUTHORIZED" | "FAILED" | "REFUNDED";

export type Payment = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerRef: string | null;
  failureReason: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthorizePaymentInput = {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodToken?: string;
};

export type RefundPaymentInput = {
  reason?: string;
};

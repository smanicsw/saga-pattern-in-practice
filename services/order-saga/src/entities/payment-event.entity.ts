import type { Payment } from "./payment.entity.js";

export const PaymentEventType = {
  Authorized: "payments.payment.authorized",
  Failed: "payments.payment.failed",
  Refunded: "payments.payment.refunded",
} as const;

export type PaymentEventType =
  (typeof PaymentEventType)[keyof typeof PaymentEventType];

export type PaymentAuthorizedPayload = {
  payment: {
    id: Payment["id"];
    orderId: Payment["orderId"];
    amount: Payment["amount"];
    currency: Payment["currency"];
  };
};

export type PaymentFailedPayload = {
  payment: {
    id: Payment["id"];
    orderId: Payment["orderId"];
    amount: Payment["amount"];
    currency: Payment["currency"];
    failureReason: Payment["failureReason"];
  };
};

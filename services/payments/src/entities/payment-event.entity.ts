import type { Payment, PaymentId, PaymentStatus } from "./payment.entity.js";

export const PaymentEventType = {
  AuthorizationRequested: "payments.payment.authorization_requested",
  Authorized: "payments.payment.authorized",
  Failed: "payments.payment.failed",
  Refunded: "payments.payment.refunded",
} as const;

export type PaymentEventType =
  (typeof PaymentEventType)[keyof typeof PaymentEventType];

export const PaymentEventVersion = {
  AuthorizationRequested: 1,
  Authorized: 1,
  Failed: 1,
  Refunded: 1,
} as const;

export type PaymentAuthorizationRequestedPayload = {
  current: Payment;
};

export type PaymentAuthorizedPayload = {
  payment: {
    id: PaymentId;
    orderId: string;
    amount: number;
    currency: string;
    providerRef: string | null;
    previous: {
      status: Extract<PaymentStatus, "PENDING">;
    };
    current: {
      status: Extract<PaymentStatus, "AUTHORIZED">;
    };
  };
};

export type PaymentFailedPayload = {
  payment: {
    id: PaymentId;
    orderId: string;
    amount: number;
    currency: string;
    failureReason: Record<string, unknown> | null;
    previous: {
      status: Extract<PaymentStatus, "PENDING">;
    };
    current: {
      status: Extract<PaymentStatus, "FAILED">;
    };
  };
};

export type PaymentRefundedPayload = {
  payment: {
    id: PaymentId;
    orderId: string;
    amount: number;
    currency: string;
    providerRef: string | null;
    previous: {
      status: Extract<PaymentStatus, "AUTHORIZED">;
    };
    current: {
      status: Extract<PaymentStatus, "REFUNDED">;
    };
  };
};

export type PaymentEventPayloadByType = {
  [PaymentEventType.AuthorizationRequested]: PaymentAuthorizationRequestedPayload;
  [PaymentEventType.Authorized]: PaymentAuthorizedPayload;
  [PaymentEventType.Failed]: PaymentFailedPayload;
  [PaymentEventType.Refunded]: PaymentRefundedPayload;
};

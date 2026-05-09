import { randomUUID } from "node:crypto";

import type { Payment } from "../../src/entities/payment.entity.js";

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultPayment(): Payment {
  return {
    id: randomUUID(),
    orderId: randomUUID(),
    amount: 49.99,
    currency: "EUR",
    status: "AUTHORIZED",
    providerRef: "provider-ref",
    failureReason: null,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

export function createOne({
  payment,
}: {
  payment?: Partial<Payment>;
} = {}): Payment {
  return { ...createDefaultPayment(), ...payment };
}

export function createMany({
  payments,
}: {
  payments: Partial<Payment>[];
}): Payment[] {
  return payments.map((payment) => createOne({ payment }));
}

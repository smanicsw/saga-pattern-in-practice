import {
  CAUSATION_ID_HEADER,
  CORRELATION_ID_HEADER,
  PAYMENTS_SERVICE_API_PREFIX,
} from "../constants/index.js";
import type {
  AuthorizePaymentInput,
  OutboxEventMetadata,
  Payment,
  RefundPaymentInput,
} from "../entities/index.js";
import { paymentsAdapter } from "../infrastructure/adapters/payments/payments.adapter.js";

export async function authorize({
  authorizePaymentInput,
  outboxEventMetadata,
}: {
  authorizePaymentInput: AuthorizePaymentInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Payment> {
  const payment = await paymentsAdapter
    .path(`${PAYMENTS_SERVICE_API_PREFIX}/authorize`)
    .post<Payment>({
      body: authorizePaymentInput,
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!payment) {
    throw new Error("Payment authorization response was empty.");
  }

  return payment;
}

export async function refund({
  paymentId,
  refundPaymentInput,
  outboxEventMetadata,
}: {
  paymentId: string;
  refundPaymentInput: RefundPaymentInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Payment> {
  const payment = await paymentsAdapter
    .path(`${PAYMENTS_SERVICE_API_PREFIX}/{paymentId}/refund`)
    .post<Payment>({
      params: { paymentId },
      body: refundPaymentInput,
      headers: buildOutboxEventHeaders({ outboxEventMetadata }),
    });

  if (!payment) {
    throw new Error("Payment refund response was empty.");
  }

  return payment;
}

function buildOutboxEventHeaders({
  outboxEventMetadata,
}: {
  outboxEventMetadata?: OutboxEventMetadata;
}): Record<string, string> {
  return Object.fromEntries(
    [
      [CORRELATION_ID_HEADER, outboxEventMetadata?.correlationId ?? null],
      [CAUSATION_ID_HEADER, outboxEventMetadata?.causationId ?? null],
    ].filter((header): header is [string, string] => header[1] !== null),
  );
}

import type {
  OutboxEventMetadata,
  PaymentAuthorizationRequestedPayload,
  PaymentAuthorizedPayload,
  PaymentFailedPayload,
  PaymentRefundedPayload,
} from "../entities/index.js";
import {
  PaymentEventType,
  PaymentEventVersion,
} from "../entities/payment-event.entity.js";
import type {
  AuthorizePaymentInput,
  FindManyPaymentsQuery,
  Payment,
  PaymentId,
  PaymentList,
  RefundPaymentInput,
} from "../entities/payment.entity.js";
import {
  InvalidPaymentStatusError,
  PaymentConflictError,
  PaymentNotFoundError,
} from "../errors/errors.js";
import { withTransaction } from "../infrastructure/adapters/database/index.js";
import * as fakePaymentProvider from "../infrastructure/adapters/payment-provider/fake-payment-provider.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import type { CreateOutboxEventInput } from "./outbox-event.manager.js";
import * as outboxEventManager from "./outbox-event.manager.js";

type PaymentAuthorizationFinalizedStatus = Extract<
  Payment["status"],
  "AUTHORIZED" | "FAILED"
>;

type PaymentAuthorizationFinalizedPayload =
  | PaymentAuthorizedPayload
  | PaymentFailedPayload;

type PaymentAuthorizationFinalizedEventConfig = {
  type: PaymentEventType;
  version: number;
  buildPayload: (payment: Payment) => PaymentAuthorizationFinalizedPayload;
};

const PAYMENT_AUTHORIZATION_FINALIZED_EVENTS = {
  AUTHORIZED: {
    type: PaymentEventType.Authorized,
    version: PaymentEventVersion.Authorized,
    buildPayload: buildPaymentAuthorizedPayload,
  },
  FAILED: {
    type: PaymentEventType.Failed,
    version: PaymentEventVersion.Failed,
    buildPayload: buildPaymentFailedPayload,
  },
} satisfies Record<
  PaymentAuthorizationFinalizedStatus,
  PaymentAuthorizationFinalizedEventConfig
>;

export async function findMany({
  query,
}: {
  query: FindManyPaymentsQuery;
}): Promise<PaymentList> {
  return paymentRepository.findMany({
    query,
  });
}

export async function findOne({
  paymentId,
}: {
  paymentId: PaymentId;
}): Promise<Payment> {
  const payment = await paymentRepository.findOne({
    paymentId,
  });

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  return payment;
}

export async function findOneByOrderId({
  orderId,
}: {
  orderId: string;
}): Promise<Payment> {
  const payment = await paymentRepository.findOneByOrderId({
    orderId,
  });

  if (!payment) {
    throw new PaymentNotFoundError();
  }

  return payment;
}

export async function authorize({
  authorizePaymentInput,
  outboxEventMetadata,
}: {
  authorizePaymentInput: AuthorizePaymentInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Payment> {
  const payment = await createPendingPaymentOrReturnExisting({
    authorizePaymentInput,
    outboxEventMetadata,
  });

  if (payment.status !== "PENDING") {
    return payment;
  }

  const providerResult = await fakePaymentProvider.authorizePayment({
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    paymentMethodToken: authorizePaymentInput.paymentMethodToken,
  });

  return withTransaction({
    operation: async () => {
      const currentPayment = await paymentRepository.findOne({
        paymentId: payment.id,
      });

      if (!currentPayment) {
        throw new PaymentNotFoundError();
      }

      if (currentPayment.status !== "PENDING") {
        return currentPayment;
      }

      const updatedPayment = await paymentRepository.updateOne({
        paymentId: payment.id,
        updatePayment: providerResult.approved
          ? {
              status: "AUTHORIZED",
              providerRef: providerResult.providerRef,
              failureReason: null,
              updatedAt: new Date().toISOString(),
            }
          : {
              status: "FAILED",
              providerRef: null,
              failureReason: providerResult.failureReason,
              updatedAt: new Date().toISOString(),
            },
      });

      if (!updatedPayment) {
        throw new PaymentNotFoundError();
      }

      const authorizationFinalizedOutboxEvent =
        buildPaymentAuthorizationFinalizedOutboxEvent({
          payment: updatedPayment,
          outboxEventMetadata,
        });

      await outboxEventManager.createOne(authorizationFinalizedOutboxEvent);

      return updatedPayment;
    },
  });
}

export async function refund({
  paymentId,
  refundPaymentInput,
  outboxEventMetadata,
}: {
  paymentId: PaymentId;
  refundPaymentInput: RefundPaymentInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Payment> {
  const payment = await withTransaction({
    operation: async () => {
      const currentPayment = await paymentRepository.findOneForUpdate({
        paymentId,
      });

      if (!currentPayment) {
        throw new PaymentNotFoundError();
      }

      if (currentPayment.status === "REFUNDED") {
        return currentPayment;
      }

      if (currentPayment.status !== "AUTHORIZED") {
        throw new InvalidPaymentStatusError();
      }

      return currentPayment;
    },
  });

  if (payment.status === "REFUNDED") {
    return payment;
  }

  await fakePaymentProvider.refundPayment({
    paymentId: payment.id,
    providerRef: payment.providerRef,
    reason: refundPaymentInput.reason,
  });

  return withTransaction({
    operation: async () => {
      const currentPayment = await paymentRepository.findOneForUpdate({
        paymentId,
      });

      if (!currentPayment) {
        throw new PaymentNotFoundError();
      }

      if (currentPayment.status === "REFUNDED") {
        return currentPayment;
      }

      if (currentPayment.status !== "AUTHORIZED") {
        throw new InvalidPaymentStatusError();
      }

      const refundedPayment = await paymentRepository.updateOne({
        paymentId,
        updatePayment: {
          status: "REFUNDED",
          updatedAt: new Date().toISOString(),
        },
      });

      if (!refundedPayment) {
        throw new PaymentNotFoundError();
      }

      const paymentRefundedOutboxEvent = buildPaymentRefundedOutboxEvent({
        payment: refundedPayment,
        outboxEventMetadata,
      });

      await outboxEventManager.createOne(paymentRefundedOutboxEvent);

      return refundedPayment;
    },
  });
}

async function createPendingPaymentOrReturnExisting({
  authorizePaymentInput,
  outboxEventMetadata,
}: {
  authorizePaymentInput: AuthorizePaymentInput;
  outboxEventMetadata?: OutboxEventMetadata;
}): Promise<Payment> {
  try {
    return await withTransaction({
      operation: async () => {
        const existingPayment = await paymentRepository.findOneByOrderId({
          orderId: authorizePaymentInput.orderId,
        });

        if (existingPayment) {
          assertCompatiblePaymentRequest({
            payment: existingPayment,
            authorizePaymentInput,
          });

          return existingPayment;
        }

        const date = new Date().toISOString();

        const payment = await paymentRepository.createOne({
          newPayment: {
            orderId: authorizePaymentInput.orderId,
            amount: authorizePaymentInput.amount,
            currency: authorizePaymentInput.currency,
            status: "PENDING",
            providerRef: null,
            failureReason: null,
            createdAt: date,
            updatedAt: date,
          },
        });

        const authorizationRequestedOutboxEvent =
          buildPaymentAuthorizationRequestedOutboxEvent({
            payment,
            outboxEventMetadata,
          });

        await outboxEventManager.createOne(authorizationRequestedOutboxEvent);

        return payment;
      },
    });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }

    const existingPayment = await paymentRepository.findOneByOrderId({
      orderId: authorizePaymentInput.orderId,
    });

    if (!existingPayment) {
      throw error;
    }

    assertCompatiblePaymentRequest({
      payment: existingPayment,
      authorizePaymentInput,
    });

    return existingPayment;
  }
}

function assertCompatiblePaymentRequest({
  payment,
  authorizePaymentInput,
}: {
  payment: Payment;
  authorizePaymentInput: AuthorizePaymentInput;
}) {
  if (
    payment.amount !== authorizePaymentInput.amount ||
    payment.currency !== authorizePaymentInput.currency
  ) {
    throw new PaymentConflictError({
      message:
        "Payment already exists for this order with a different amount or currency.",
    });
  }

  if (payment.status === "REFUNDED") {
    throw new PaymentConflictError({
      message: "Payment for this order was already refunded.",
    });
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

function buildPaymentAuthorizationRequestedOutboxEvent({
  payment,
  outboxEventMetadata,
}: {
  payment: Payment;
  outboxEventMetadata?: OutboxEventMetadata;
}): CreateOutboxEventInput<PaymentAuthorizationRequestedPayload> {
  return {
    type: PaymentEventType.AuthorizationRequested,
    version: PaymentEventVersion.AuthorizationRequested,
    action: "create",
    aggregate: buildPaymentAggregate({ payment }),
    payload: {
      current: payment,
    },
    ...(outboxEventMetadata ?? {}),
  };
}

function buildPaymentAuthorizationFinalizedOutboxEvent({
  payment,
  outboxEventMetadata,
}: {
  payment: Payment;
  outboxEventMetadata?: OutboxEventMetadata;
}): CreateOutboxEventInput<PaymentAuthorizationFinalizedPayload> {
  if (!isPaymentAuthorizationFinalizedStatus(payment.status)) {
    throw new InvalidPaymentStatusError();
  }

  const eventConfig = PAYMENT_AUTHORIZATION_FINALIZED_EVENTS[payment.status];

  return {
    type: eventConfig.type,
    version: eventConfig.version,
    action: "update",
    aggregate: buildPaymentAggregate({ payment }),
    payload: eventConfig.buildPayload(payment),
    ...(outboxEventMetadata ?? {}),
  };
}

function buildPaymentRefundedOutboxEvent({
  payment,
  outboxEventMetadata,
}: {
  payment: Payment;
  outboxEventMetadata?: OutboxEventMetadata;
}): CreateOutboxEventInput<PaymentRefundedPayload> {
  return {
    type: PaymentEventType.Refunded,
    version: PaymentEventVersion.Refunded,
    action: "update",
    aggregate: buildPaymentAggregate({ payment }),
    payload: {
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        providerRef: payment.providerRef,
        previous: {
          status: "AUTHORIZED",
        },
        current: {
          status: "REFUNDED",
        },
      },
    },
    ...(outboxEventMetadata ?? {}),
  };
}

function buildPaymentAuthorizedPayload(
  payment: Payment,
): PaymentAuthorizedPayload {
  return {
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      providerRef: payment.providerRef,
      previous: {
        status: "PENDING",
      },
      current: {
        status: "AUTHORIZED",
      },
    },
  };
}

function buildPaymentFailedPayload(payment: Payment): PaymentFailedPayload {
  return {
    payment: {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      failureReason: payment.failureReason,
      previous: {
        status: "PENDING",
      },
      current: {
        status: "FAILED",
      },
    },
  };
}

function buildPaymentAggregate({ payment }: { payment: Payment }) {
  return {
    type: "payment",
    id: payment.id,
  };
}

function isPaymentAuthorizationFinalizedStatus(
  status: Payment["status"],
): status is PaymentAuthorizationFinalizedStatus {
  return status in PAYMENT_AUTHORIZATION_FINALIZED_EVENTS;
}

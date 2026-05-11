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
}: {
  authorizePaymentInput: AuthorizePaymentInput;
}): Promise<Payment> {
  const payment = await createPendingPaymentOrReturnExisting({
    authorizePaymentInput,
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

      return updatedPayment;
    },
  });
}

export async function refund({
  paymentId,
  refundPaymentInput,
}: {
  paymentId: PaymentId;
  refundPaymentInput: RefundPaymentInput;
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

      return refundedPayment;
    },
  });
}

async function createPendingPaymentOrReturnExisting({
  authorizePaymentInput,
}: {
  authorizePaymentInput: AuthorizePaymentInput;
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

        return paymentRepository.createOne({
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

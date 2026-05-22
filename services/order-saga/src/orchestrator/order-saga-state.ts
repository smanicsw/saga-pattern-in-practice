import type { OrderId } from "../entities/index.js";
import * as orderSagaRepository from "../repositories/order-saga.repository.js";
import { getErrorMessage } from "./orchestration-error.js";

export async function createOrderSagaIfNeeded({
  orderId,
  paymentMethodToken,
}: {
  orderId: OrderId;
  paymentMethodToken?: string | null;
}) {
  const date = new Date().toISOString();

  const { orderSaga } = await orderSagaRepository.createOneOrFindExisting({
    newOrderSaga: {
      orderId,
      status: "STARTED",
      currentStep: "RESERVE_INVENTORY",
      reservationId: null,
      paymentId: null,
      paymentMethodToken: paymentMethodToken ?? null,
      failureReason: null,
      createdAt: date,
      updatedAt: date,
    },
  });

  return orderSaga;
}

export async function markOrderSagaReservationCreated({
  orderId,
  reservationId,
}: {
  orderId: OrderId;
  reservationId: string;
}): Promise<void> {
  const date = new Date().toISOString();

  const orderSaga = await orderSagaRepository.updateOneReservationCreated({
    orderId,
    updateOrderSagaReservationCreated: {
      status: "RESERVATION_CREATED",
      currentStep: "AUTHORIZE_PAYMENT",
      reservationId,
      failureReason: null,
      updatedAt: date,
    },
  });

  if (!orderSaga) {
    throw new Error(
      "Order saga was not found while marking reservation created.",
    );
  }
}

export async function markOrderSagaPaymentAuthorized({
  orderId,
  paymentId,
}: {
  orderId: OrderId;
  paymentId: string;
}): Promise<void> {
  const date = new Date().toISOString();

  const orderSaga = await orderSagaRepository.updateOnePaymentAuthorized({
    orderId,
    updateOrderSagaPaymentAuthorized: {
      status: "PAYMENT_AUTHORIZED",
      currentStep: "CONFIRM_RESERVATION",
      paymentId,
      failureReason: null,
      updatedAt: date,
    },
  });

  if (!orderSaga) {
    throw new Error(
      "Order saga was not found while marking payment authorized.",
    );
  }
}

export async function markOrderSagaReservationConfirmed({
  orderId,
}: {
  orderId: OrderId;
}): Promise<void> {
  const date = new Date().toISOString();

  const orderSaga = await orderSagaRepository.updateOneReservationConfirmed({
    orderId,
    updateOrderSagaReservationConfirmed: {
      status: "RESERVATION_CONFIRMED",
      currentStep: "CONFIRM_ORDER",
      failureReason: null,
      updatedAt: date,
    },
  });

  if (!orderSaga) {
    throw new Error(
      "Order saga was not found while marking reservation confirmed.",
    );
  }
}

export async function markOrderSagaCompleted({
  orderId,
}: {
  orderId: OrderId;
}): Promise<void> {
  const date = new Date().toISOString();

  const orderSaga = await orderSagaRepository.updateOneCompleted({
    orderId,
    updateOrderSagaCompleted: {
      status: "COMPLETED",
      currentStep: "COMPLETED",
      failureReason: null,
      updatedAt: date,
    },
  });

  if (!orderSaga) {
    throw new Error("Order saga was not found while marking completed.");
  }
}

export async function markOrderSagaFailed({
  error,
  orderId,
}: {
  error: unknown;
  orderId: OrderId;
}): Promise<void> {
  const date = new Date().toISOString();

  const orderSaga = await orderSagaRepository.updateOneFailed({
    orderId,
    updateOrderSagaFailed: {
      status: "FAILED",
      currentStep: "FAILED",
      failureReason: {
        message: getErrorMessage({ error }),
      },
      updatedAt: date,
    },
  });

  if (!orderSaga) {
    throw new Error("Order saga was not found while marking failed.");
  }
}

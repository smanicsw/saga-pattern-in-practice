import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../../repositories/inventory.repository.js";
import * as orderSagaRepository from "../../repositories/order-saga.repository.js";
import * as paymentsRepository from "../../repositories/payments.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { assertOrderCancelledEvent } from "../event-guards.js";
import { isInventoryRequestFailureCode } from "../orchestration-error.js";
import { markOrderSagaFailed } from "../order-saga-state.js";

export async function handleOrderCancelled({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertOrderCancelledEvent(event);

  const { order } = event.payload;
  const orderSaga = await orderSagaRepository.findOneByOrderId({
    orderId: order.id,
  });

  if (!orderSaga?.reservationId || orderSaga.status === "COMPLETED") {
    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        reservationId: orderSaga?.reservationId ?? null,
        sagaStatus: orderSaga?.status ?? null,
      },
      "order saga skipped order cancelled event",
    );

    return;
  }

  if (orderSaga.paymentId) {
    await paymentsRepository.refund({
      paymentId: orderSaga.paymentId,
      refundPaymentInput: {
        reason: "ORDER_CANCELLED",
      },
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  }

  try {
    await inventoryRepository.releaseReservation({
      reservationId: orderSaga.reservationId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  } catch (error) {
    if (
      isInventoryRequestFailureCode({
        error,
        code: "invalid_reservation_status",
      })
    ) {
      logger.info(
        {
          eventId: event.id,
          orderId: order.id,
          reservationId: orderSaga.reservationId,
        },
        "order saga skipped manual order cancellation because reservation cannot be released",
      );

      return;
    }

    throw error;
  }

  await markOrderSagaFailed({
    error: new Error("Order was cancelled."),
    orderId: order.id,
  });

  logger.info(
    {
      eventId: event.id,
      orderId: order.id,
      paymentId: orderSaga.paymentId,
      reservationId: orderSaga.reservationId,
    },
    "order saga released reservation after order cancellation",
  );
}

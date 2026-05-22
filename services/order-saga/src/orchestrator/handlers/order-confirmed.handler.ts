import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../../repositories/inventory.repository.js";
import * as orderSagaRepository from "../../repositories/order-saga.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { assertOrderConfirmedEvent } from "../event-guards.js";
import { isInventoryRequestFailureCode } from "../orchestration-error.js";

export async function handleOrderConfirmed({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertOrderConfirmedEvent(event);

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
      "order saga skipped order confirmed event",
    );

    return;
  }

  try {
    await inventoryRepository.confirmReservation({
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
        "order saga skipped manual order confirmation because reservation cannot be confirmed",
      );

      return;
    }

    throw error;
  }
}

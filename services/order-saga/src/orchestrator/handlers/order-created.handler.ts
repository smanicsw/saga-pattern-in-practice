import type { ConsumedKafkaEventContext, OutboxEvent } from "@saga/outbox-kit";

import { logger } from "../../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../../repositories/inventory.repository.js";
import * as orderRepository from "../../repositories/order.repository.js";
import { buildCausalMetadata } from "../causal-metadata.js";
import { cancelOrderAfterFailedReservation } from "../compensation.js";
import { assertOrderCreatedEvent } from "../event-guards.js";
import { isInventoryReservationBusinessFailure } from "../orchestration-error.js";
import {
  createOrderSagaIfNeeded,
  markOrderSagaFailed,
  markOrderSagaReservationCreated,
} from "../order-saga-state.js";

export async function handleOrderCreated({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertOrderCreatedEvent(event);

  const order = event.payload.current;
  const currentOrder = await findOrderOrThrow({ orderId: order.id });

  if (currentOrder.status !== "PENDING") {
    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        orderStatus: currentOrder.status,
      },
      "order saga skipped order created event because order is no longer pending",
    );

    return;
  }

  const orderSaga = await createOrderSagaIfNeeded({
    orderId: order.id,
    paymentMethodToken: event.payload.paymentMethodToken,
  });

  if (orderSaga.reservationId) {
    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        orderSagaId: orderSaga.id,
        reservationId: orderSaga.reservationId,
      },
      "order saga skipped inventory reservation because it already exists",
    );

    return;
  }

  try {
    const reservation = await inventoryRepository.createReservation({
      createReservationInput: {
        orderId: order.id,
        products: order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
      outboxEventMetadata: buildCausalMetadata({ event }),
    });

    await markOrderSagaReservationCreated({
      orderId: order.id,
      reservationId: reservation.id,
    });

    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        reservationId: reservation.id,
      },
      "order saga created inventory reservation",
    );
  } catch (error) {
    if (isInventoryReservationBusinessFailure({ error })) {
      await cancelOrderAfterFailedReservation({
        error,
        event,
        orderId: order.id,
      });

      return;
    }

    await markOrderSagaFailed({
      error,
      orderId: order.id,
    });

    throw error;
  }
}

async function findOrderOrThrow({ orderId }: { orderId: string }) {
  const order = await orderRepository.findOne({ orderId });

  if (!order) {
    throw new Error("Order was not found while handling order created event.");
  }

  return order;
}

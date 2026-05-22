import {
  calculateNextAttemptAt,
  createKafkaEventConsumer,
  type ConsumedKafkaEventContext,
  type KafkaEventHandler,
  type OutboxEvent,
} from "@saga/outbox-kit";

import { config } from "../config.js";
import type {
  InboxEvent,
  InboxEventSourceService,
  NewInboxEvent,
  OrderCancelledPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  PaymentAuthorizedPayload,
  PaymentFailedPayload,
  ReservationConfirmedPayload,
  ReservationCreatedPayload,
} from "../entities/index.js";
import {
  InventoryEventType,
  OrderEventType,
  PaymentEventType,
} from "../entities/index.js";
import {
  connectDatabase,
  disconnectDatabase,
  withTransaction,
} from "../infrastructure/adapters/database/index.js";
import { InventoryRequestFailedError } from "../errors/errors.js";
import { logger } from "../infrastructure/adapters/logger/index.js";
import * as inventoryRepository from "../repositories/inventory.repository.js";
import * as inboxEventRepository from "../repositories/inbox-event.repository.js";
import * as orderSagaRepository from "../repositories/order-saga.repository.js";
import * as paymentsRepository from "../repositories/payments.repository.js";
import * as orderManager from "../managers/order.manager.js";

const SUBSCRIBED_TOPICS = [
  "outbox-events.order",
  "outbox-events.inventory",
  "outbox-events.payments",
] as const;

const orchestrationHandlers = {
  [OrderEventType.Created]: handleOrderCreated,
  [OrderEventType.Confirmed]: handleOrderConfirmed,
  [OrderEventType.Cancelled]: handleOrderCancelled,
  [InventoryEventType.ReservationCreated]: handleReservationCreated,
  [PaymentEventType.Authorized]: handlePaymentAuthorized,
  [PaymentEventType.Failed]: handlePaymentFailed,
  [InventoryEventType.ReservationConfirmed]: handleReservationConfirmed,
} satisfies Record<string, KafkaEventHandler>;

const consumer = createKafkaEventConsumer({
  brokers: config.KAFKA_BROKERS,
  clientId: "order-orchestrator-worker",
  groupId: config.KAFKA_ORDER_ORCHESTRATOR_GROUP_ID,
  topics: [...SUBSCRIBED_TOPICS],
  handlers: buildInboxBackedHandlers({
    handlers: orchestrationHandlers,
  }),
  fromBeginning: true,
  logger,
});

export async function startOrchestratorWorker(): Promise<void> {
  await connectDatabase();
  await consumer.start();
}

export async function stopOrchestratorWorker(): Promise<void> {
  await consumer.stop();
  await disconnectDatabase();
}

export async function handleConsumedEvent<TPayload = unknown>({
  context,
  event,
  handler,
}: {
  context: ConsumedKafkaEventContext;
  event: OutboxEvent<TPayload>;
  handler: KafkaEventHandler<TPayload>;
}): Promise<void> {
  const inboxEvent = await markInboxEventAsProcessing({
    context,
    event,
  });

  if (inboxEvent.status === "PROCESSED") {
    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      "kafka event skipped because it was already processed",
    );

    return;
  }

  try {
    await handler({ context, event });
    await markInboxEventAsProcessed({ event });
  } catch (error) {
    await markInboxEventAsFailed({
      error,
      event,
      attempts: inboxEvent.attempts,
    });

    throw error;
  }
}

function buildInboxBackedHandlers({
  handlers,
}: {
  handlers: Record<string, KafkaEventHandler>;
}): Record<string, KafkaEventHandler> {
  return Object.fromEntries(
    Object.entries(handlers).map(([eventType, handler]) => [
      eventType,
      (input) => handleConsumedEvent({ ...input, handler }),
    ]),
  );
}

async function markInboxEventAsProcessing<TPayload>({
  context,
  event,
}: {
  context: ConsumedKafkaEventContext;
  event: OutboxEvent<TPayload>;
}): Promise<InboxEvent<TPayload>> {
  return withTransaction({
    operation: async () => {
      const date = new Date().toISOString();

      const { inboxEvent } =
        await inboxEventRepository.createOneOrFindExisting<TPayload>({
          inboxEvent: buildNewInboxEvent({
            context,
            date,
            event,
          }),
        });

      if (inboxEvent.status === "PROCESSED") {
        return inboxEvent;
      }

      const processingInboxEvent =
        await inboxEventRepository.markOneAsProcessing({
          eventId: event.id,
          markInboxEventAsProcessing: {
            status: "PROCESSING",
            attempts: inboxEvent.attempts + 1,
            updatedAt: date,
          },
        });

      if (!processingInboxEvent) {
        throw new Error("Inbox event was not found while marking processing.");
      }

      return processingInboxEvent as InboxEvent<TPayload>;
    },
  });
}

async function markInboxEventAsProcessed({
  event,
}: {
  event: OutboxEvent;
}): Promise<void> {
  const date = new Date().toISOString();

  const inboxEvent = await inboxEventRepository.markOneAsProcessed({
    eventId: event.id,
    markInboxEventAsProcessed: {
      status: "PROCESSED",
      processedAt: date,
      updatedAt: date,
    },
  });

  if (!inboxEvent) {
    throw new Error("Inbox event was not found while marking processed.");
  }
}

async function markInboxEventAsFailed({
  attempts,
  error,
  event,
}: {
  attempts: number;
  error: unknown;
  event: OutboxEvent;
}): Promise<void> {
  const date = new Date().toISOString();

  const inboxEvent = await inboxEventRepository.markOneAsFailed({
    eventId: event.id,
    markInboxEventAsFailed: {
      status: "FAILED",
      attempts,
      nextAttemptAt: calculateNextAttemptAt({
        attempts,
        failedAt: date,
      }),
      deadLetteredAt: null,
      lastError: getErrorMessage({ error }),
      updatedAt: date,
    },
  });

  if (!inboxEvent) {
    throw new Error("Inbox event was not found while marking failed.");
  }
}

function buildNewInboxEvent<TPayload>({
  context,
  date,
  event,
}: {
  context: ConsumedKafkaEventContext;
  date: string;
  event: OutboxEvent<TPayload>;
}): NewInboxEvent<TPayload> {
  return {
    eventId: event.id,
    type: event.type,
    version: event.version,
    sourceService: toInboxEventSourceService({ service: event.service }),
    aggregate: event.aggregate,
    topic: context.topic,
    partition: context.partition,
    messageOffset: context.messageOffset,
    payload: event.payload,
    headers: context.headers,
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: date,
    receivedAt: date,
    processedAt: null,
    deadLetteredAt: null,
    lastError: null,
    createdAt: date,
    updatedAt: date,
  };
}

async function handleOrderCreated({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertOrderCreatedEvent(event);

  const order = event.payload.current;
  const currentOrder = await orderManager.findOne({
    orderId: order.id,
  });

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

async function handleReservationCreated({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertReservationCreatedEvent(event);

  const reservation = event.payload.current;
  const order = await orderManager.findOne({
    orderId: reservation.orderId,
  });

  if (order.status !== "PENDING") {
    logger.info(
      {
        eventId: event.id,
        orderId: order.id,
        orderStatus: order.status,
        reservationId: reservation.id,
      },
      "order saga skipped reservation created event because order is no longer pending",
    );

    return;
  }

  const orderSaga = await createOrderSagaIfNeeded({
    orderId: reservation.orderId,
  });

  if (!orderSaga.reservationId) {
    await markOrderSagaReservationCreated({
      orderId: reservation.orderId,
      reservationId: reservation.id,
    });
  }

  if (orderSaga.paymentId) {
    logger.info(
      {
        eventId: event.id,
        orderId: reservation.orderId,
        paymentId: orderSaga.paymentId,
      },
      "order saga skipped payment authorization because payment already exists",
    );

    return;
  }

  await paymentsRepository.authorize({
    authorizePaymentInput: {
      orderId: order.id,
      amount: order.totalAmount,
      currency: order.currency,
      paymentMethodToken: orderSaga.paymentMethodToken ?? undefined,
    },
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  logger.info(
    {
      eventId: event.id,
      orderId: order.id,
      reservationId: reservation.id,
    },
    "order saga requested payment authorization",
  );
}

async function handleOrderConfirmed({
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
    if (isInventoryRequestFailureCode({ error, code: "invalid_reservation_status" })) {
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

async function handleOrderCancelled({
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
    if (isInventoryRequestFailureCode({ error, code: "invalid_reservation_status" })) {
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

async function handlePaymentAuthorized({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertPaymentAuthorizedEvent(event);

  const { payment } = event.payload;
  const order = await orderManager.findOne({
    orderId: payment.orderId,
  });
  const orderSaga = await orderSagaRepository.findOneByOrderId({
    orderId: payment.orderId,
  });

  if (!orderSaga?.reservationId) {
    throw new Error("Order saga reservation is missing for authorized payment.");
  }

  if (order.status === "CANCELLED") {
    await compensateAuthorizedPaymentFailure({
      error: new Error("Order was cancelled before payment authorization completed."),
      event,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    });

    return;
  }

  if (order.status === "CONFIRMED") {
    logger.info(
      {
        eventId: event.id,
        orderId: payment.orderId,
        orderStatus: order.status,
      },
      "order saga skipped payment authorized event because order is already confirmed",
    );

    return;
  }

  await markOrderSagaPaymentAuthorized({
    orderId: payment.orderId,
    paymentId: payment.id,
  });

  try {
    await inventoryRepository.confirmReservation({
      reservationId: orderSaga.reservationId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  } catch (error) {
    await compensateAuthorizedPaymentFailure({
      error,
      event,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    });

    throw error;
  }

  logger.info(
    {
      eventId: event.id,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga.reservationId,
    },
    "order saga requested reservation confirmation",
  );
}

async function handlePaymentFailed({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertPaymentFailedEvent(event);

  const { payment } = event.payload;
  const order = await orderManager.findOne({
    orderId: payment.orderId,
  });
  const orderSaga = await orderSagaRepository.findOneByOrderId({
    orderId: payment.orderId,
  });

  if (orderSaga?.reservationId) {
    await inventoryRepository.releaseReservation({
      reservationId: orderSaga.reservationId,
      outboxEventMetadata: buildCausalMetadata({ event }),
    });
  }

  if (order.status === "PENDING") {
    await withTransaction({
      operation: () =>
        orderManager.cancelOne({
          orderId: payment.orderId,
          outboxEventMetadata: buildCausalMetadata({ event }),
        }),
    });
  }

  await markOrderSagaFailed({
    error: new Error("Payment authorization failed."),
    orderId: payment.orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId: payment.orderId,
      paymentId: payment.id,
      reservationId: orderSaga?.reservationId ?? null,
    },
    "order saga compensated failed payment",
  );
}

async function handleReservationConfirmed({
  event,
}: {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
}): Promise<void> {
  assertReservationConfirmedEvent(event);

  const { reservation } = event.payload;
  const order = await orderManager.findOne({
    orderId: reservation.orderId,
  });

  await markOrderSagaReservationConfirmed({
    orderId: reservation.orderId,
  });

  if (order.status === "PENDING") {
    await withTransaction({
      operation: () =>
        orderManager.confirmOne({
          orderId: reservation.orderId,
          outboxEventMetadata: buildCausalMetadata({ event }),
        }),
    });
  } else if (order.status !== "CONFIRMED") {
    await markOrderSagaFailed({
      error: new Error(
        `Reservation was confirmed after order moved to ${order.status}.`,
      ),
      orderId: reservation.orderId,
    });

    logger.info(
      {
        eventId: event.id,
        orderId: reservation.orderId,
        orderStatus: order.status,
        reservationId: reservation.id,
      },
      "order saga skipped reservation confirmed event because order cannot be confirmed",
    );

    return;
  }

  await markOrderSagaCompleted({
    orderId: reservation.orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId: reservation.orderId,
      reservationId: reservation.id,
    },
    "order saga completed",
  );
}

async function createOrderSagaIfNeeded({ orderId }: { orderId: string }) {
  const date = new Date().toISOString();

  const { orderSaga } = await orderSagaRepository.createOneOrFindExisting({
    newOrderSaga: {
      orderId,
      status: "STARTED",
      currentStep: "RESERVE_INVENTORY",
      reservationId: null,
      paymentId: null,
      paymentMethodToken: null,
      failureReason: null,
      createdAt: date,
      updatedAt: date,
    },
  });

  return orderSaga;
}

async function markOrderSagaReservationCreated({
  orderId,
  reservationId,
}: {
  orderId: string;
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

async function markOrderSagaPaymentAuthorized({
  orderId,
  paymentId,
}: {
  orderId: string;
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
    throw new Error("Order saga was not found while marking payment authorized.");
  }
}

async function markOrderSagaReservationConfirmed({
  orderId,
}: {
  orderId: string;
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

async function markOrderSagaCompleted({
  orderId,
}: {
  orderId: string;
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

async function markOrderSagaFailed({
  error,
  orderId,
}: {
  error: unknown;
  orderId: string;
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

async function compensateAuthorizedPaymentFailure({
  error,
  event,
  orderId,
  paymentId,
  reservationId,
}: {
  error: unknown;
  event: OutboxEvent;
  orderId: string;
  paymentId: string;
  reservationId: string;
}): Promise<void> {
  await paymentsRepository.refund({
    paymentId,
    refundPaymentInput: {
      reason: "ORDER_SAGA_FAILED",
    },
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await inventoryRepository.releaseReservation({
    reservationId,
    outboxEventMetadata: buildCausalMetadata({ event }),
  });

  await withTransaction({
    operation: () =>
      orderManager.cancelOne({
        orderId,
        outboxEventMetadata: buildCausalMetadata({ event }),
      }),
  });

  await markOrderSagaFailed({
    error,
    orderId,
  });
}

async function cancelOrderAfterFailedReservation({
  error,
  event,
  orderId,
}: {
  error: unknown;
  event: OutboxEvent;
  orderId: string;
}): Promise<void> {
  await withTransaction({
    operation: () =>
      orderManager.cancelOne({
        orderId,
        outboxEventMetadata: buildCausalMetadata({ event }),
      }),
  });

  await markOrderSagaFailed({
    error,
    orderId,
  });

  logger.info(
    {
      eventId: event.id,
      orderId,
      reason: getErrorMessage({ error }),
    },
    "order saga cancelled order because inventory reservation was rejected",
  );
}

function assertOrderCreatedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderCreatedPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Created ||
    !isOrderCreatedPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order created event.");
  }
}

function assertOrderConfirmedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderConfirmedPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Confirmed ||
    !isOrderStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order confirmed event.");
  }
}

function assertOrderCancelledEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<OrderCancelledPayload, "order"> {
  if (
    event.service !== "order" ||
    event.type !== OrderEventType.Cancelled ||
    !isOrderStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid order cancelled event.");
  }
}

function assertReservationCreatedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<ReservationCreatedPayload, "inventory"> {
  if (
    event.service !== "inventory" ||
    event.type !== InventoryEventType.ReservationCreated ||
    !isReservationCreatedPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid reservation created event.");
  }
}

function assertReservationConfirmedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<ReservationConfirmedPayload, "inventory"> {
  if (
    event.service !== "inventory" ||
    event.type !== InventoryEventType.ReservationConfirmed ||
    !isReservationStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid reservation confirmed event.");
  }
}

function assertPaymentAuthorizedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<PaymentAuthorizedPayload, "payments"> {
  if (
    event.service !== "payments" ||
    event.type !== PaymentEventType.Authorized ||
    !isPaymentStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid payment authorized event.");
  }
}

function assertPaymentFailedEvent(
  event: OutboxEvent,
): asserts event is OutboxEvent<PaymentFailedPayload, "payments"> {
  if (
    event.service !== "payments" ||
    event.type !== PaymentEventType.Failed ||
    !isPaymentStatusPayload(event.payload)
  ) {
    throw new Error("Kafka event is not a valid payment failed event.");
  }
}

function isOrderCreatedPayload(
  payload: unknown,
): payload is OrderCreatedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "current" in payload &&
    typeof (payload as { current?: unknown }).current === "object" &&
    (payload as { current?: unknown }).current !== null &&
    "id" in (payload as { current: Record<string, unknown> }).current &&
    typeof (payload as { current: { id?: unknown } }).current.id === "string" &&
    "items" in (payload as { current: Record<string, unknown> }).current &&
    Array.isArray((payload as { current: { items?: unknown } }).current.items)
  );
}

function isOrderStatusPayload(
  payload: unknown,
): payload is OrderConfirmedPayload | OrderCancelledPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "order" in payload &&
    typeof (payload as { order?: unknown }).order === "object" &&
    (payload as { order?: unknown }).order !== null &&
    "id" in (payload as { order: Record<string, unknown> }).order &&
    typeof (payload as { order: { id?: unknown } }).order.id === "string"
  );
}

function isReservationCreatedPayload(
  payload: unknown,
): payload is ReservationCreatedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "current" in payload &&
    typeof (payload as { current?: unknown }).current === "object" &&
    (payload as { current?: unknown }).current !== null &&
    "id" in (payload as { current: Record<string, unknown> }).current &&
    "orderId" in (payload as { current: Record<string, unknown> }).current &&
    typeof (payload as { current: { id?: unknown } }).current.id === "string" &&
    typeof (payload as { current: { orderId?: unknown } }).current.orderId ===
      "string"
  );
}

function isReservationStatusPayload(
  payload: unknown,
): payload is ReservationConfirmedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "reservation" in payload &&
    typeof (payload as { reservation?: unknown }).reservation === "object" &&
    (payload as { reservation?: unknown }).reservation !== null &&
    "id" in (payload as { reservation: Record<string, unknown> }).reservation &&
    "orderId" in
      (payload as { reservation: Record<string, unknown> }).reservation &&
    typeof (payload as { reservation: { id?: unknown } }).reservation.id ===
      "string" &&
    typeof (payload as { reservation: { orderId?: unknown } }).reservation
      .orderId === "string"
  );
}

function isPaymentStatusPayload(
  payload: unknown,
): payload is PaymentAuthorizedPayload | PaymentFailedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "payment" in payload &&
    typeof (payload as { payment?: unknown }).payment === "object" &&
    (payload as { payment?: unknown }).payment !== null &&
    "id" in (payload as { payment: Record<string, unknown> }).payment &&
    "orderId" in (payload as { payment: Record<string, unknown> }).payment &&
    typeof (payload as { payment: { id?: unknown } }).payment.id === "string" &&
    typeof (payload as { payment: { orderId?: unknown } }).payment.orderId ===
      "string"
  );
}

function buildCausalMetadata({
  event,
}: {
  event: OutboxEvent;
}) {
  return {
    correlationId: event.correlationId ?? event.id,
    causationId: event.id,
  };
}

function toInboxEventSourceService({
  service,
}: {
  service: string;
}): InboxEventSourceService {
  if (
    service === "order" ||
    service === "inventory" ||
    service === "payments"
  ) {
    return service;
  }

  throw new Error(`Unsupported inbox event source service: ${service}`);
}

function isInventoryReservationBusinessFailure({
  error,
}: {
  error: unknown;
}): boolean {
  return (
    error instanceof InventoryRequestFailedError &&
    error.upstreamStatus >= 400 &&
    error.upstreamStatus < 500 &&
    [
      "insufficient_stock",
      "stock_not_found",
      "product_not_found",
      "invalid_reservation_status",
    ].includes(error.upstreamError)
  );
}

function isInventoryRequestFailureCode({
  code,
  error,
}: {
  code: string;
  error: unknown;
}): boolean {
  return (
    error instanceof InventoryRequestFailedError &&
    error.upstreamError === code
  );
}

function getErrorMessage({ error }: { error: unknown }): string {
  if (error instanceof InventoryRequestFailedError) {
    return `${error.message} (${error.upstreamError})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown orchestration error.";
}

function registerShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info({ signal }, "stopping order orchestrator worker");

      stopOrchestratorWorker().catch((error) => {
        logger.error({ error }, "failed to stop order orchestrator worker");
        process.exit(1);
      });
    });
  }
}

if (isDirectRun()) {
  registerShutdownHandlers();

  startOrchestratorWorker().catch((error) => {
    logger.error({ error }, "failed to start order orchestrator worker");
    process.exit(1);
  });
}

function isDirectRun(): boolean {
  const executedFilePath = process.argv[1];

  return (
    executedFilePath?.endsWith("src/orchestrator/worker.ts") === true ||
    executedFilePath?.endsWith("dist/orchestrator/worker.js") === true
  );
}

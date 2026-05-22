import type {
  NewOrderSaga,
  NewOrderSagaRow,
  OrderId,
  OrderSaga,
  OrderSagaRow,
  UpdateOrderSagaCompleted,
  UpdateOrderSagaCompletedRow,
  UpdateOrderSagaFailed,
  UpdateOrderSagaFailedRow,
  UpdateOrderSagaPaymentAuthorized,
  UpdateOrderSagaPaymentAuthorizedRow,
  UpdateOrderSagaReservationConfirmed,
  UpdateOrderSagaReservationConfirmedRow,
  UpdateOrderSagaReservationCreated,
  UpdateOrderSagaReservationCreatedRow,
} from "../entities/index.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

const ORDER_SAGA_RETURNING_COLUMNS = [
  "id",
  "order_id",
  "status",
  "current_step",
  "reservation_id",
  "payment_id",
  "payment_method_token",
  "failure_reason",
  "created_at",
  "updated_at",
];

export async function createOneOrFindExisting({
  newOrderSaga,
}: {
  newOrderSaga: NewOrderSaga;
}): Promise<{ created: boolean; orderSaga: OrderSaga }> {
  const db = getQueryBuilder();

  const [createdOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .insert(transformToRow({ newOrderSaga }))
    .onConflict("order_id")
    .ignore()
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (createdOrderSagaRow) {
    return {
      created: true,
      orderSaga: transformFromRow({ orderSagaRow: createdOrderSagaRow }),
    };
  }

  const existingOrderSaga = await findOneByOrderId({
    orderId: newOrderSaga.orderId,
  });

  if (!existingOrderSaga) {
    throw new Error(
      "Order saga insert conflicted but no existing row was found.",
    );
  }

  return {
    created: false,
    orderSaga: existingOrderSaga,
  };
}

export async function findOneByOrderId({
  orderId,
}: {
  orderId: OrderId;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const orderSagaRow = (await db<OrderSagaRow>("order_sagas")
    .select(ORDER_SAGA_RETURNING_COLUMNS)
    .where("order_id", orderId)
    .first()) as OrderSagaRow | undefined;

  if (!orderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow });
}

export async function updateOneReservationCreated({
  orderId,
  updateOrderSagaReservationCreated,
}: {
  orderId: OrderId;
  updateOrderSagaReservationCreated: UpdateOrderSagaReservationCreated;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const [updatedOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .where("order_id", orderId)
    .update(
      transformReservationCreatedToRow({
        updateOrderSagaReservationCreated,
      }),
    )
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (!updatedOrderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow: updatedOrderSagaRow });
}

export async function updateOneFailed({
  orderId,
  updateOrderSagaFailed,
}: {
  orderId: OrderId;
  updateOrderSagaFailed: UpdateOrderSagaFailed;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const [updatedOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .where("order_id", orderId)
    .update(transformFailedToRow({ updateOrderSagaFailed }))
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (!updatedOrderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow: updatedOrderSagaRow });
}

export async function updateOnePaymentAuthorized({
  orderId,
  updateOrderSagaPaymentAuthorized,
}: {
  orderId: OrderId;
  updateOrderSagaPaymentAuthorized: UpdateOrderSagaPaymentAuthorized;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const [updatedOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .where("order_id", orderId)
    .update(
      transformPaymentAuthorizedToRow({
        updateOrderSagaPaymentAuthorized,
      }),
    )
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (!updatedOrderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow: updatedOrderSagaRow });
}

export async function updateOneReservationConfirmed({
  orderId,
  updateOrderSagaReservationConfirmed,
}: {
  orderId: OrderId;
  updateOrderSagaReservationConfirmed: UpdateOrderSagaReservationConfirmed;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const [updatedOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .where("order_id", orderId)
    .update(
      transformReservationConfirmedToRow({
        updateOrderSagaReservationConfirmed,
      }),
    )
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (!updatedOrderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow: updatedOrderSagaRow });
}

export async function updateOneCompleted({
  orderId,
  updateOrderSagaCompleted,
}: {
  orderId: OrderId;
  updateOrderSagaCompleted: UpdateOrderSagaCompleted;
}): Promise<OrderSaga | null> {
  const db = getQueryBuilder();

  const [updatedOrderSagaRow] = (await db<OrderSagaRow>("order_sagas")
    .where("order_id", orderId)
    .update(transformCompletedToRow({ updateOrderSagaCompleted }))
    .returning(ORDER_SAGA_RETURNING_COLUMNS)) as OrderSagaRow[];

  if (!updatedOrderSagaRow) {
    return null;
  }

  return transformFromRow({ orderSagaRow: updatedOrderSagaRow });
}

function transformToRow({
  newOrderSaga,
}: {
  newOrderSaga: NewOrderSaga;
}): NewOrderSagaRow {
  return {
    order_id: newOrderSaga.orderId,
    status: newOrderSaga.status,
    current_step: newOrderSaga.currentStep,
    reservation_id: newOrderSaga.reservationId,
    payment_id: newOrderSaga.paymentId,
    payment_method_token: newOrderSaga.paymentMethodToken,
    failure_reason: newOrderSaga.failureReason,
    created_at: newOrderSaga.createdAt,
    updated_at: newOrderSaga.updatedAt,
  };
}

function transformPaymentAuthorizedToRow({
  updateOrderSagaPaymentAuthorized,
}: {
  updateOrderSagaPaymentAuthorized: UpdateOrderSagaPaymentAuthorized;
}): UpdateOrderSagaPaymentAuthorizedRow {
  return {
    status: updateOrderSagaPaymentAuthorized.status,
    current_step: updateOrderSagaPaymentAuthorized.currentStep,
    payment_id: updateOrderSagaPaymentAuthorized.paymentId,
    failure_reason: updateOrderSagaPaymentAuthorized.failureReason,
    updated_at: updateOrderSagaPaymentAuthorized.updatedAt,
  };
}

function transformReservationConfirmedToRow({
  updateOrderSagaReservationConfirmed,
}: {
  updateOrderSagaReservationConfirmed: UpdateOrderSagaReservationConfirmed;
}): UpdateOrderSagaReservationConfirmedRow {
  return {
    status: updateOrderSagaReservationConfirmed.status,
    current_step: updateOrderSagaReservationConfirmed.currentStep,
    failure_reason: updateOrderSagaReservationConfirmed.failureReason,
    updated_at: updateOrderSagaReservationConfirmed.updatedAt,
  };
}

function transformCompletedToRow({
  updateOrderSagaCompleted,
}: {
  updateOrderSagaCompleted: UpdateOrderSagaCompleted;
}): UpdateOrderSagaCompletedRow {
  return {
    status: updateOrderSagaCompleted.status,
    current_step: updateOrderSagaCompleted.currentStep,
    failure_reason: updateOrderSagaCompleted.failureReason,
    updated_at: updateOrderSagaCompleted.updatedAt,
  };
}

function transformReservationCreatedToRow({
  updateOrderSagaReservationCreated,
}: {
  updateOrderSagaReservationCreated: UpdateOrderSagaReservationCreated;
}): UpdateOrderSagaReservationCreatedRow {
  return {
    status: updateOrderSagaReservationCreated.status,
    current_step: updateOrderSagaReservationCreated.currentStep,
    reservation_id: updateOrderSagaReservationCreated.reservationId,
    failure_reason: updateOrderSagaReservationCreated.failureReason,
    updated_at: updateOrderSagaReservationCreated.updatedAt,
  };
}

function transformFailedToRow({
  updateOrderSagaFailed,
}: {
  updateOrderSagaFailed: UpdateOrderSagaFailed;
}): UpdateOrderSagaFailedRow {
  return {
    status: updateOrderSagaFailed.status,
    current_step: updateOrderSagaFailed.currentStep,
    failure_reason: updateOrderSagaFailed.failureReason,
    updated_at: updateOrderSagaFailed.updatedAt,
  };
}

function transformFromRow({
  orderSagaRow,
}: {
  orderSagaRow: OrderSagaRow;
}): OrderSaga {
  return {
    id: orderSagaRow.id,
    orderId: orderSagaRow.order_id,
    status: orderSagaRow.status,
    currentStep: orderSagaRow.current_step,
    reservationId: orderSagaRow.reservation_id,
    paymentId: orderSagaRow.payment_id,
    paymentMethodToken: orderSagaRow.payment_method_token,
    failureReason: orderSagaRow.failure_reason,
    createdAt: toStringValue(orderSagaRow.created_at),
    updatedAt: toStringValue(orderSagaRow.updated_at),
  };
}

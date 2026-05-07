import { OrderId } from "../entities/order.entity.js";
import {
  NewReservation,
  NewReservationRow,
  Reservation,
  ReservationId,
  ReservationRow,
  UpdateReservationStatus,
  UpdateReservationStatusRow,
} from "../entities/reservation.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function createOne({
  newReservation,
}: {
  newReservation: NewReservation;
}): Promise<Omit<Reservation, "products">> {
  const db = getQueryBuilder();

  const reservationRowToCreate = transformToRow({ newReservation });

  const [createdReservationRow] = await db<ReservationRow>("reservations")
    .insert(reservationRowToCreate)
    .returning(["id", "order_id", "status", "created_at", "updated_at"]);

  return transformFromRow({ reservationRow: createdReservationRow });
}

export async function findOneByOrderId({
  orderId,
}: {
  orderId: OrderId;
}): Promise<Omit<Reservation, "products"> | null> {
  const db = getQueryBuilder();

  const reservationRow = await db<ReservationRow>("reservations")
    .select(["id", "order_id", "status", "created_at", "updated_at"])
    .where("order_id", orderId)
    .first();

  if (!reservationRow) {
    return null;
  }

  return transformFromRow({ reservationRow });
}

export async function findOne({
  reservationId,
}: {
  reservationId: ReservationId;
}): Promise<Omit<Reservation, "products"> | null> {
  const db = getQueryBuilder();

  const reservationRow = await db<ReservationRow>("reservations")
    .select(["id", "order_id", "status", "created_at", "updated_at"])
    .where("id", reservationId)
    .first();

  if (!reservationRow) {
    return null;
  }

  return transformFromRow({ reservationRow });
}

export async function findOneForUpdate({
  reservationId,
}: {
  reservationId: ReservationId;
}): Promise<Omit<Reservation, "products"> | null> {
  const db = getQueryBuilder();

  const reservationRow = await db<ReservationRow>("reservations")
    .select(["id", "order_id", "status", "created_at", "updated_at"])
    .where("id", reservationId)
    .forUpdate()
    .first();

  if (!reservationRow) {
    return null;
  }

  return transformFromRow({ reservationRow });
}

export async function updateOneStatus({
  reservationId,
  updateReservationStatus,
}: {
  reservationId: ReservationId;
  updateReservationStatus: UpdateReservationStatus;
}): Promise<Omit<Reservation, "products"> | null> {
  const db = getQueryBuilder();

  const reservationRowToUpdate = transformStatusUpdateToRow({
    updateReservationStatus,
  });

  const [updatedReservationRow] = await db<ReservationRow>("reservations")
    .where("id", reservationId)
    .update(reservationRowToUpdate)
    .returning(["id", "order_id", "status", "created_at", "updated_at"]);

  if (!updatedReservationRow) {
    return null;
  }

  return transformFromRow({ reservationRow: updatedReservationRow });
}

function transformToRow({
  newReservation,
}: {
  newReservation: NewReservation;
}): NewReservationRow {
  return {
    order_id: newReservation.orderId,
    status: newReservation.status,
    created_at: newReservation.createdAt,
    updated_at: newReservation.updatedAt,
  };
}

function transformStatusUpdateToRow({
  updateReservationStatus,
}: {
  updateReservationStatus: UpdateReservationStatus;
}): UpdateReservationStatusRow {
  return {
    status: updateReservationStatus.status,
    updated_at: updateReservationStatus.updatedAt,
  };
}

function transformFromRow({
  reservationRow,
}: {
  reservationRow: ReservationRow;
}): Omit<Reservation, "products"> {
  return {
    id: reservationRow.id,
    orderId: reservationRow.order_id,
    status: reservationRow.status,
    createdAt: toStringValue(reservationRow.created_at),
    updatedAt: toStringValue(reservationRow.updated_at),
  };
}

import {
  NewReservationProduct,
  NewReservationProductRow,
  ReservationId,
  ReservationProduct,
  ReservationProductRow,
} from "../entities/reservation.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

export async function createMany({
  newReservationProducts,
}: {
  newReservationProducts: NewReservationProduct[];
}): Promise<ReservationProduct[]> {
  if (newReservationProducts.length === 0) {
    return [];
  }

  const db = getQueryBuilder();

  const reservationProductRowsToCreate = newReservationProducts.map(
    (newReservationProduct) => transformToRow({ newReservationProduct }),
  );

  const createdReservationProductRows = await db<ReservationProductRow>(
    "reservation_products",
  )
    .insert(reservationProductRowsToCreate)
    .returning([
      "id",
      "reservation_id",
      "product_id",
      "quantity",
      "created_at",
      "updated_at",
    ]);

  return createdReservationProductRows.map((reservationProductRow) =>
    transformFromRow({ reservationProductRow }),
  );
}

export async function findManyByReservationId({
  reservationId,
}: {
  reservationId: ReservationId;
}): Promise<ReservationProduct[]> {
  const db = getQueryBuilder();

  const reservationProductRows = await db<ReservationProductRow>(
    "reservation_products",
  )
    .select([
      "id",
      "reservation_id",
      "product_id",
      "quantity",
      "created_at",
      "updated_at",
    ])
    .where("reservation_id", reservationId)
    .orderBy("created_at", "asc")
    .orderBy("id", "asc");

  return reservationProductRows.map((reservationProductRow) =>
    transformFromRow({ reservationProductRow }),
  );
}

function transformToRow({
  newReservationProduct,
}: {
  newReservationProduct: NewReservationProduct;
}): NewReservationProductRow {
  return {
    reservation_id: newReservationProduct.reservationId,
    product_id: newReservationProduct.productId,
    quantity: newReservationProduct.quantity,
    created_at: newReservationProduct.createdAt,
    updated_at: newReservationProduct.updatedAt,
  };
}

function transformFromRow({
  reservationProductRow,
}: {
  reservationProductRow: ReservationProductRow;
}): ReservationProduct {
  return {
    id: reservationProductRow.id,
    reservationId: reservationProductRow.reservation_id,
    productId: reservationProductRow.product_id,
    quantity: reservationProductRow.quantity,
    createdAt: toStringValue(reservationProductRow.created_at),
    updatedAt: toStringValue(reservationProductRow.updated_at),
  };
}

import { randomUUID } from "node:crypto";

import type {
  Reservation,
  ReservationProduct,
} from "../../src/entities/reservation.entity.js";

const DEFAULT_CREATED_AT = "2026-05-05T10:00:00.000Z";

function createDefaultReservation(): Reservation {
  return {
    id: randomUUID(),
    orderId: randomUUID(),
    status: "PENDING",
    products: [],
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

function createDefaultReservationProduct(): ReservationProduct {
  return {
    id: randomUUID(),
    reservationId: randomUUID(),
    productId: randomUUID(),
    quantity: 1,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  };
}

export function createOne({
  reservation,
}: {
  reservation?: Partial<Reservation>;
} = {}): Reservation {
  return { ...createDefaultReservation(), ...reservation };
}

export function createItem({
  reservationProduct,
}: {
  reservationProduct?: Partial<ReservationProduct>;
} = {}): ReservationProduct {
  return { ...createDefaultReservationProduct(), ...reservationProduct };
}

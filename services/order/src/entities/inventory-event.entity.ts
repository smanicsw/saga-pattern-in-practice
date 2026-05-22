import type { Reservation } from "./reservation.entity.js";

export const InventoryEventType = {
  ReservationCreated: "inventory.reservation.created",
  ReservationConfirmed: "inventory.reservation.confirmed",
  ReservationReleased: "inventory.reservation.released",
} as const;

export type InventoryEventType =
  (typeof InventoryEventType)[keyof typeof InventoryEventType];

export type ReservationCreatedPayload = {
  current: Reservation;
};

export type ReservationConfirmedPayload = {
  reservation: {
    id: Reservation["id"];
    orderId: Reservation["orderId"];
  };
};

export type ReservationReleasedPayload = {
  reservation: {
    id: Reservation["id"];
    orderId: Reservation["orderId"];
  };
};

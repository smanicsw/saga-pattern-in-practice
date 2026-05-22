import type { OrderId } from "./order.entity.js";

export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED" | "FAILED";

export type ReservationProduct = {
  id: string;
  reservationId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  orderId: OrderId;
  status: ReservationStatus;
  products: ReservationProduct[];
  createdAt: string;
  updatedAt: string;
};

export type CreateReservationInput = {
  orderId: OrderId;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
};

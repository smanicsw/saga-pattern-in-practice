import { OrderId } from "./order.entity.js";
import type { ProductId } from "./product.entity.js";

export type ReservationId = string;

export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED" | "FAILED";

export type ReservationProduct = {
  id: string;
  reservationId: ReservationId;
  productId: ProductId;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ReservationProductRow = {
  id: string;
  reservation_id: ReservationId;
  product_id: ProductId;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type NewReservationProduct = Omit<ReservationProduct, "id">;

export type NewReservationProductRow = Omit<ReservationProductRow, "id">;

export type Reservation = {
  id: ReservationId;
  orderId: OrderId;
  status: ReservationStatus;
  products: ReservationProduct[];
  createdAt: string;
  updatedAt: string;
};

export type ReservationRow = {
  id: ReservationId;
  order_id: OrderId;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
};

export type NewReservation = Omit<Reservation, "id" | "products">;

export type NewReservationRow = Omit<ReservationRow, "id">;

export type CreateReservationInput = {
  orderId: OrderId;
  products: Array<{
    productId: ProductId;
    quantity: number;
  }>;
};

import { request } from "./client";
import type {
  CreateOrderInput,
  Order,
  OrderList,
  OrderStatus,
  Reservation,
} from "./types";

export function listOrders(
  params: {
    cursor?: string;
    customerId?: string;
    limit?: number;
    status?: OrderStatus | "";
  } = {},
) {
  const searchParams = new URLSearchParams();

  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  if (params.customerId) {
    searchParams.set("customerId", params.customerId);
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();

  return request<OrderList>(`/api/order/orders${query ? `?${query}` : ""}`);
}

export function createOrder(input: CreateOrderInput) {
  return request<Order>("/api/order/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function confirmOrder(orderId: string) {
  return request<Order>(`/api/order/orders/${orderId}/confirm`, {
    method: "POST",
  });
}

export function cancelOrder(orderId: string) {
  return request<Order>(`/api/order/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export function getReservationByOrderId(orderId: string) {
  return request<Reservation>(
    `/api/inventory/reservations/by-order/${orderId}`,
  );
}

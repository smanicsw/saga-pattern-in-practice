import type { Order, OrderId, OrderStatus } from "./order.entity.js";

export const OrderEventType = {
  Created: "order.order.created",
  Confirmed: "order.order.confirmed",
  Cancelled: "order.order.cancelled",
} as const;

export type OrderEventType =
  (typeof OrderEventType)[keyof typeof OrderEventType];

export const OrderEventVersion = {
  Created: 1,
  Confirmed: 1,
  Cancelled: 1,
} as const;

export type OrderCreatedPayload = {
  current: Order;
};

export type OrderConfirmedPayload = {
  order: {
    id: OrderId;
    previous: {
      status: Extract<OrderStatus, "PENDING">;
    };
    current: {
      status: Extract<OrderStatus, "CONFIRMED">;
    };
  };
};

export type OrderCancelledPayload = {
  order: {
    id: OrderId;
    previous: {
      status: Extract<OrderStatus, "PENDING">;
    };
    current: {
      status: Extract<OrderStatus, "CANCELLED">;
    };
  };
};

export type OrderEventPayloadByType = {
  [OrderEventType.Created]: OrderCreatedPayload;
  [OrderEventType.Confirmed]: OrderConfirmedPayload;
  [OrderEventType.Cancelled]: OrderCancelledPayload;
};

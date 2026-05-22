import { Type, type Static } from "@sinclair/typebox";

import { DEFAULT_ORDERS_LIMIT } from "../../constants/index.js";

export const OrderStatus = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("CONFIRMED"),
  Type.Literal("CANCELLED"),
]);

export const OrderItemResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  orderId: Type.String({ format: "uuid" }),
  productId: Type.String({ format: "uuid" }),
  quantity: Type.Integer({ minimum: 1 }),
  unitPriceSnapshot: Type.Number({ minimum: 0 }),
  lineTotalSnapshot: Type.Number({ minimum: 0 }),
  skuSnapshot: Type.String(),
  nameSnapshot: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type OrderItemResponse = Static<typeof OrderItemResponse>;

export const OrderResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  customerId: Type.String({ minLength: 1, maxLength: 120 }),
  status: OrderStatus,
  totalAmount: Type.Number({ minimum: 0 }),
  currency: Type.String({ minLength: 3, maxLength: 3 }),
  items: Type.Array(OrderItemResponse),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type OrderResponse = Static<typeof OrderResponse>;

export const FindOneOrderParams = Type.Object({
  orderId: Type.String({ format: "uuid" }),
});

export type FindOneOrderParams = Static<typeof FindOneOrderParams>;

export const FindOneOrderResponse = OrderResponse;

export type FindOneOrderResponse = Static<typeof FindOneOrderResponse>;

export const FindManyOrdersQuery = Type.Object({
  status: Type.Optional(OrderStatus),
  customerId: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      default: DEFAULT_ORDERS_LIMIT,
    }),
  ),
  cursor: Type.Optional(Type.String({ format: "uuid" })),
});

export type FindManyOrdersQuery = Static<typeof FindManyOrdersQuery>;

export const FindManyOrdersResponse = Type.Object({
  items: Type.Array(OrderResponse),
  pagination: Type.Object({
    limit: Type.Integer({ minimum: 1 }),
    nextCursor: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  }),
});

export type FindManyOrdersResponse = Static<typeof FindManyOrdersResponse>;

export const CreateOneOrderBody = Type.Object(
  {
    customerId: Type.String({ minLength: 1, maxLength: 120 }),
    paymentMethodToken: Type.Optional(
      Type.String({ minLength: 1, maxLength: 255 }),
    ),
    items: Type.Array(
      Type.Object(
        {
          productId: Type.String({ format: "uuid" }),
          quantity: Type.Integer({ minimum: 1 }),
        },
        { additionalProperties: false },
      ),
      { minItems: 1 },
    ),
  },
  {
    additionalProperties: false,
  },
);

export type CreateOneOrderBody = Static<typeof CreateOneOrderBody>;

export const CreateOneOrderResponse = OrderResponse;

export type CreateOneOrderResponse = Static<typeof CreateOneOrderResponse>;

export const ConfirmOneOrderParams = FindOneOrderParams;

export type ConfirmOneOrderParams = Static<typeof ConfirmOneOrderParams>;

export const ConfirmOneOrderResponse = OrderResponse;

export type ConfirmOneOrderResponse = Static<typeof ConfirmOneOrderResponse>;

export const CancelOneOrderParams = FindOneOrderParams;

export type CancelOneOrderParams = Static<typeof CancelOneOrderParams>;

export const CancelOneOrderResponse = OrderResponse;

export type CancelOneOrderResponse = Static<typeof CancelOneOrderResponse>;

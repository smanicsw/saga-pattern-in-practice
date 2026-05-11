import { Type, type Static } from "@sinclair/typebox";
import { DEFAULT_PAYMENTS_LIMIT } from "../../constants/index.js";

export const paymentOverviewResponseSchema = Type.Object(
  {
    message: Type.String(),
    next: Type.String(),
    totalPayments: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type PaymentOverviewResponse = Static<
  typeof paymentOverviewResponseSchema
>;

export const PaymentStatus = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("AUTHORIZED"),
  Type.Literal("FAILED"),
  Type.Literal("REFUNDED"),
]);

export const PaymentResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  orderId: Type.String({ format: "uuid" }),
  amount: Type.Number({ minimum: 0 }),
  currency: Type.String({ minLength: 3, maxLength: 3 }),
  status: PaymentStatus,
  providerRef: Type.Union([Type.String(), Type.Null()]),
  failureReason: Type.Union([
    Type.Record(Type.String(), Type.Unknown()),
    Type.Null(),
  ]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type PaymentResponse = Static<typeof PaymentResponse>;

export const FindOnePaymentParams = Type.Object({
  paymentId: Type.String({ format: "uuid" }),
});

export type FindOnePaymentParams = Static<typeof FindOnePaymentParams>;

export const FindOnePaymentResponse = PaymentResponse;

export type FindOnePaymentResponse = Static<typeof FindOnePaymentResponse>;

export const FindOnePaymentByOrderIdParams = Type.Object({
  orderId: Type.String({ format: "uuid" }),
});

export type FindOnePaymentByOrderIdParams = Static<
  typeof FindOnePaymentByOrderIdParams
>;

export const FindOnePaymentByOrderIdResponse = PaymentResponse;

export type FindOnePaymentByOrderIdResponse = Static<
  typeof FindOnePaymentByOrderIdResponse
>;

export const AuthorizePaymentBody = Type.Object(
  {
    orderId: Type.String({ format: "uuid" }),
    amount: Type.Number({ minimum: 0.01 }),
    currency: Type.String({ minLength: 3, maxLength: 3 }),
    paymentMethodToken: Type.Optional(
      Type.String({ minLength: 1, maxLength: 255 }),
    ),
  },
  {
    additionalProperties: false,
  },
);

export type AuthorizePaymentBody = Static<typeof AuthorizePaymentBody>;

export const AuthorizePaymentResponse = PaymentResponse;

export type AuthorizePaymentResponse = Static<typeof AuthorizePaymentResponse>;

export const RefundPaymentParams = Type.Object({
  paymentId: Type.String({ format: "uuid" }),
});

export type RefundPaymentParams = Static<typeof RefundPaymentParams>;

export const RefundPaymentBody = Type.Object(
  {
    reason: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  },
  {
    additionalProperties: false,
  },
);

export type RefundPaymentBody = Static<typeof RefundPaymentBody>;

export const RefundPaymentResponse = PaymentResponse;

export type RefundPaymentResponse = Static<typeof RefundPaymentResponse>;

export const FindManyPaymentsQuery = Type.Object({
  orderId: Type.Optional(Type.String({ format: "uuid" })),
  status: Type.Optional(PaymentStatus),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      default: DEFAULT_PAYMENTS_LIMIT,
    }),
  ),
  cursor: Type.Optional(Type.String({ format: "uuid" })),
});

export type FindManyPaymentsQuery = Static<typeof FindManyPaymentsQuery>;

export const FindManyPaymentsResponse = Type.Object({
  items: Type.Array(PaymentResponse),
  pagination: Type.Object({
    limit: Type.Integer({ minimum: 1 }),
    nextCursor: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
  }),
});

export type FindManyPaymentsResponse = Static<typeof FindManyPaymentsResponse>;

import { Static, Type } from "@sinclair/typebox";

export const ReservationStatus = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("CONFIRMED"),
  Type.Literal("RELEASED"),
  Type.Literal("FAILED"),
]);

export const ReservationProductResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  reservationId: Type.String({ format: "uuid" }),
  productId: Type.String({ format: "uuid" }),
  quantity: Type.Integer({ minimum: 1 }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type ReservationProductResponse = Static<typeof ReservationProductResponse>;

export const ReservationResponse = Type.Object({
  id: Type.String({ format: "uuid" }),
  orderId: Type.String({ format: "uuid" }),
  status: ReservationStatus,
  products: Type.Array(ReservationProductResponse),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

export type ReservationResponse = Static<typeof ReservationResponse>;

export const CreateOneReservationBody = Type.Object(
  {
    orderId: Type.String({ format: "uuid" }),
    products: Type.Array(
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
  { additionalProperties: false },
);

export type CreateOneReservationBody = Static<
  typeof CreateOneReservationBody
>;

export const CreateOneReservationResponse = ReservationResponse;

export type CreateOneReservationResponse = Static<
  typeof CreateOneReservationResponse
>;

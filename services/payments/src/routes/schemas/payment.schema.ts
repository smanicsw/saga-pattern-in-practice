import { Type, type Static } from "@sinclair/typebox";

export const paymentOverviewResponseSchema = Type.Object(
  {
    message: Type.String(),
    next: Type.String(),
    totalPayments: Type.Integer({ minimum: 0 })
  },
  { additionalProperties: false }
);

export type PaymentOverviewResponse = Static<
  typeof paymentOverviewResponseSchema
>;

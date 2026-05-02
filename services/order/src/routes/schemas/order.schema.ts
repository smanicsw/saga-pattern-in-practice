import { Type, type Static } from "@sinclair/typebox";

export const orderOverviewResponseSchema = Type.Object(
  {
    message: Type.String(),
    next: Type.String(),
    totalOrders: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export type OrderOverviewResponse = Static<typeof orderOverviewResponseSchema>;

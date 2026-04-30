import { Type, type Static } from "@sinclair/typebox";

export const inventoryOverviewResponseSchema = Type.Object(
  {
    message: Type.String(),
    next: Type.String(),
    totalItems: Type.Integer({ minimum: 0 })
  },
  { additionalProperties: false }
);

export type InventoryOverviewResponse = Static<
  typeof inventoryOverviewResponseSchema
>;

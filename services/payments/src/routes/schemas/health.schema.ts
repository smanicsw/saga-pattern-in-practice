import { Type, type Static } from "@sinclair/typebox";

export const healthResponseSchema = Type.Object(
  {
    service: Type.Literal("payments"),
    status: Type.Literal("ok"),
  },
  { additionalProperties: false },
);

export type HealthResponse = Static<typeof healthResponseSchema>;

import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const envSchema = Type.Object(
  {
    NODE_ENV: Type.Union(
      [
        Type.Literal("development"),
        Type.Literal("test"),
        Type.Literal("production")
      ],
      { default: "development" }
    ),
    ORDER_SERVICE_PORT: Type.Integer({ minimum: 1, default: 3001 })
  },
  { additionalProperties: false }
);

export type Config = Static<typeof envSchema>;

export const config: Config = Value.Parse(envSchema, process.env);

import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const envSchema = Type.Object(
  {
    NODE_ENV: Type.Union(
      [
        Type.Literal("development"),
        Type.Literal("test"),
        Type.Literal("production"),
      ],
      { default: "development" },
    ),
    DATABASE_URL: Type.String({ minLength: 1 }),
    ORDER_SERVICE_BASE_URL: Type.String({
      minLength: 1,
      default: "http://localhost:3001",
    }),
    INVENTORY_SERVICE_BASE_URL: Type.String({
      minLength: 1,
      default: "http://localhost:3003",
    }),
    PAYMENTS_SERVICE_BASE_URL: Type.String({
      minLength: 1,
      default: "http://localhost:3002",
    }),
    KAFKA_BROKERS: Type.String({
      minLength: 1,
      default: "localhost:9092",
    }),
    KAFKA_ORDER_SAGA_GROUP_ID: Type.String({
      minLength: 1,
      default: "order-saga-orchestrator",
    }),
  },
  { additionalProperties: false },
);

export type Config = Static<typeof envSchema>;

export const config: Config = Value.Parse(envSchema, process.env);

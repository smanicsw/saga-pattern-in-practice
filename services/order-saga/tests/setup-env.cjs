process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.ORDER_SAGA_TEST_DATABASE_URL ??
  "postgresql://postgres:change_me_order_saga@localhost:5440/order_saga_test_db";
process.env.ORDER_SERVICE_BASE_URL =
  process.env.ORDER_SERVICE_BASE_URL ?? "http://localhost:3001";
process.env.INVENTORY_SERVICE_BASE_URL =
  process.env.INVENTORY_SERVICE_BASE_URL ?? "http://localhost:3003";
process.env.PAYMENTS_SERVICE_BASE_URL =
  process.env.PAYMENTS_SERVICE_BASE_URL ?? "http://localhost:3002";
process.env.KAFKA_BROKERS = process.env.KAFKA_BROKERS ?? "localhost:9092";

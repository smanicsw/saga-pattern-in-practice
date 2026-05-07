process.env.NODE_ENV = "test";
process.env.PAYMENT_SERVICE_PORT ||= "3002";
process.env.DATABASE_URL ||=
  process.env.PAYMENTS_TEST_DATABASE_URL ||
  "postgresql://postgres:change_me_payments@localhost:5438/payments_test_db";

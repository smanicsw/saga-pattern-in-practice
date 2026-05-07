process.env.NODE_ENV = "test";
process.env.ORDER_SERVICE_PORT ||= "3001";
process.env.DATABASE_URL ||=
  process.env.ORDER_TEST_DATABASE_URL ||
  "postgresql://postgres:change_me_order@localhost:5437/order_test_db";

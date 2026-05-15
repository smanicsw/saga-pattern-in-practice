process.env.NODE_ENV = "test";
process.env.ORDER_SERVICE_PORT ||= "3001";
process.env.INVENTORY_SERVICE_BASE_URL ||= "http://127.0.0.1:3003";
process.env.DATABASE_URL ||=
  process.env.ORDER_TEST_DATABASE_URL ||
  "postgresql://postgres:change_me_order@localhost:5437/order_test_db";

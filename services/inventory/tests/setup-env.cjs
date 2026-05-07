process.env.NODE_ENV = "test";
process.env.INVENTORY_SERVICE_PORT ||= "3003";
process.env.DATABASE_URL ||=
  process.env.INVENTORY_TEST_DATABASE_URL ||
  "postgresql://postgres:change_me_inventory@localhost:5436/inventory_test_db";

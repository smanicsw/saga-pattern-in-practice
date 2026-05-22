exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("order_sagas", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable().unique();
    table
      .string("status", 40)
      .notNullable()
      .checkIn([
        "STARTED",
        "RESERVATION_CREATED",
        "PAYMENT_AUTHORIZED",
        "RESERVATION_CONFIRMED",
        "COMPLETED",
        "COMPENSATING",
        "FAILED",
      ]);
    table
      .string("current_step", 60)
      .notNullable()
      .checkIn([
        "RESERVE_INVENTORY",
        "AUTHORIZE_PAYMENT",
        "CONFIRM_RESERVATION",
        "CONFIRM_ORDER",
        "COMPENSATE",
        "COMPLETED",
        "FAILED",
      ]);
    table.uuid("reservation_id");
    table.uuid("payment_id");
    table.string("payment_method_token", 255);
    table.jsonb("failure_reason");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["status"]);
    table.index(["current_step"]);
    table.index(["reservation_id"]);
    table.index(["payment_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("order_sagas");
};

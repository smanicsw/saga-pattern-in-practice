exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("inventory_reservations", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable();
    table
      .string("status", 20)
      .notNullable()
      .checkIn(["PENDING", "CONFIRMED", "RELEASED", "FAILED"]);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["order_id"]);
    table.index(["status"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("inventory_reservations");
};

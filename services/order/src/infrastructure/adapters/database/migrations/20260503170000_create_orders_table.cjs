exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("orders", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("customer_id", 120).notNullable();
    table
      .string("status", 20)
      .notNullable()
      .checkIn(["PENDING", "CONFIRMED", "CANCELLED"]);
    table.decimal("total_amount", 12, 2).notNullable();
    table.string("currency", 3).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["status"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("orders");
};

exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("payments", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table.string("currency", 3).notNullable();
    table
      .string("status", 20)
      .notNullable()
      .checkIn(["PENDING", "AUTHORIZED", "FAILED", "REFUNDED"]);
    table.string("provider_ref", 160).nullable();
    table.jsonb("failure_reason").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["order_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("payments");
};

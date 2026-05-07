
exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("products", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("sku", 120).notNullable().unique();
    table.string("name", 255).notNullable();
    table.text("description");
    table.decimal("price", 12, 2).notNullable();
    table.string("currency", 3).notNullable().defaultTo("EUR");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("products");
};

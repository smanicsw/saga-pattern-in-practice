exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("order_items", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("order_id")
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");
    table.uuid("product_id").notNullable();
    table.integer("quantity").notNullable();
    table.check("quantity > 0");
    table.decimal("unit_price_snapshot", 12, 2).notNullable();
    table.decimal("line_total_snapshot", 12, 2).notNullable();
    table.string("sku_snapshot", 120).notNullable();
    table.string("name_snapshot", 255).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["order_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("order_items");
};

exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("reservation_products", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("reservation_id")
      .notNullable()
      .references("id")
      .inTable("reservations")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.integer("quantity").notNullable();
    table.check("quantity > 0");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["reservation_id"]);
    table.index(["product_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("reservation_products");
};

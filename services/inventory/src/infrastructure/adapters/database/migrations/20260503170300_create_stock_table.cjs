exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("stock", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("product_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table.integer("available_quantity").notNullable().defaultTo(0);
    table.check("available_quantity >= 0");
    table.integer("reserved_quantity").notNullable().defaultTo(0);
    table.check("reserved_quantity >= 0");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("stock");
};

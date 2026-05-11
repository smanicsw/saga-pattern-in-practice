exports.up = async function (knex) {
  return knex.schema.alterTable("payments", function (table) {
    table.unique(["order_id"], {
      indexName: "payments_order_id_unique",
    });
  });
};

exports.down = async function (knex) {
  return knex.schema.alterTable("payments", function (table) {
    table.dropUnique(["order_id"], "payments_order_id_unique");
  });
};

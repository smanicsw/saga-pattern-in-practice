exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("outbox_events", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("event_type", 255).notNullable();
    table.integer("event_version").notNullable();
    table
      .string("action", 20)
      .notNullable()
      .checkIn(["create", "update", "delete"]);
    table.string("service", 120).notNullable().checkIn(["payments"]);
    table.string("aggregate_type", 120).notNullable();
    table.uuid("aggregate_id").notNullable();
    table.jsonb("payload").notNullable();
    table.uuid("correlation_id");
    table.uuid("causation_id");
    table.timestamp("occurred_at").notNullable().defaultTo(knex.fn.now());
    table
      .string("status", 20)
      .notNullable()
      .defaultTo("PENDING")
      .checkIn(["PENDING", "PUBLISHED", "DEAD_LETTERED"]);
    table.timestamp("published_at");
    table.timestamp("dead_lettered_at");
    table.integer("attempts").notNullable().defaultTo(0);
    table.timestamp("next_attempt_at").defaultTo(knex.fn.now());
    table.text("last_error");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["status", "next_attempt_at"]);
    table.index(["published_at"]);
    table.index(["dead_lettered_at"]);
    table.index(["next_attempt_at"]);
    table.index(["aggregate_type", "aggregate_id"]);
    table.index(["event_type"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("outbox_events");
};

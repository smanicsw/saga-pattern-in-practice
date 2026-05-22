exports.up = async function (knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  return knex.schema.createTable("inbox_events", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("event_id").notNullable().unique();
    table.string("event_type", 255).notNullable();
    table.integer("event_version").notNullable();
    table
      .string("source_service", 120)
      .notNullable()
      .checkIn(["order", "inventory", "payments"]);
    table.string("aggregate_type", 120).notNullable();
    table.uuid("aggregate_id").notNullable();
    table.string("topic", 255).notNullable();
    table.integer("partition");
    table.string("message_offset", 120);
    table.jsonb("payload").notNullable();
    table.jsonb("headers").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table
      .string("status", 20)
      .notNullable()
      .defaultTo("PENDING")
      .checkIn([
        "PENDING",
        "PROCESSING",
        "PROCESSED",
        "FAILED",
        "DEAD_LETTERED",
      ]);
    table.integer("attempts").notNullable().defaultTo(0);
    table.timestamp("next_attempt_at").defaultTo(knex.fn.now());
    table.timestamp("received_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("processed_at");
    table.timestamp("dead_lettered_at");
    table.text("last_error");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["status", "next_attempt_at"]);
    table.index(["event_type"]);
    table.index(["source_service"]);
    table.index(["aggregate_type", "aggregate_id"]);
    table.index(["topic", "partition", "message_offset"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("inbox_events");
};

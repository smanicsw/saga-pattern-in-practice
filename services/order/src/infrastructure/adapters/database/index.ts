import knex, { type Knex } from "knex";

import { config } from "../../../config.js";
import { logger } from "../logger/index.js";

let db: Knex | null = null;

export function getDatabase(): Knex {
  if (!db) {
    throw new Error("Database is not connected. Call connectDatabase first.");
  }

  return db;
}

export async function connectDatabase() {
  if (db) {
    return;
  }

  db = knex({
    client: "pg",
    connection: config.DATABASE_URL,
    pool: { min: 0, max: 10 },
  });

  await db.raw("select 1");
  logger.info("database adapter connected");
}

export async function disconnectDatabase() {
  if (!db) {
    return;
  }

  await db.destroy();
  db = null;
  logger.info("database adapter disconnected");
}

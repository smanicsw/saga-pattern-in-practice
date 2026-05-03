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

  const candidate = knex({
    client: "pg",
    connection: config.DATABASE_URL,
    pool: { min: 0, max: 10 },
  });

  try {
    await candidate.raw("select 1");
    db = candidate;
    logger.info("database adapter connected");
  } catch (error) {
    await candidate.destroy();
    logger.error({ error }, "database adapter connection failed");
    throw error;
  }
}

export async function disconnectDatabase() {
  if (!db) {
    return;
  }

  await db.destroy();
  db = null;
  logger.info("database adapter disconnected");
}

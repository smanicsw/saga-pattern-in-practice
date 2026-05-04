import knex, { type Knex } from "knex";
import { AsyncLocalStorage } from "node:async_hooks";

import { config } from "../../../config.js";
import { logger } from "../logger/index.js";

let db: Knex | null = null;
const transactionContext = new AsyncLocalStorage<Knex.Transaction>();

export function getDatabase(): Knex {
  if (!db) {
    throw new Error("Database is not connected. Call connectDatabase first.");
  }

  return db;
}

export function getCurrentTransaction(): Knex.Transaction | undefined {
  return transactionContext.getStore();
}

export function getQueryBuilder(): Knex | Knex.Transaction {
  const transaction = getCurrentTransaction();

  return transaction ?? getDatabase();
}

export async function withTransaction<T>({
  operation,
}: {
  operation: () => Promise<T>;
}): Promise<T> {
  const knexInstance = getDatabase();

  const transaction = getCurrentTransaction();

  if (transaction) {
    return operation();
  }

  return knexInstance.transaction(async (trx) => {
    return transactionContext.run(trx, operation);

  });
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

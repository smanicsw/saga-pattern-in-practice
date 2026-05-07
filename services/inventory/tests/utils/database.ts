import path from "node:path";

import {
  connectDatabase,
  disconnectDatabase,
  getDatabase,
} from "../../src/infrastructure/adapters/database/index.js";

const migrationsDirectory = path.resolve(
  process.cwd(),
  "src/infrastructure/adapters/database/migrations",
);

export function setupTestDatabaseHooks() {
  beforeAll(async () => {
    await connectDatabase();
    await migrateTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });
}

export async function migrateTestDatabase() {
  const db = getDatabase();

  await db.migrate.latest({
    directory: migrationsDirectory,
  });
}

export async function cleanTestDatabase() {
  const db = getDatabase();

  await db.raw(`
    truncate table
      inventory_reservation_items,
      inventory_reservations,
      stock,
      products
    restart identity cascade
  `);
}

export async function insert(
  dataByTable: Record<string, Array<Record<string, unknown>>>,
) {
  const db = getDatabase();

  await db.transaction(async (trx) => {
    for (const [tableName, rows] of Object.entries(dataByTable)) {
      if (rows.length === 0) {
        continue;
      }

      await trx(tableName).insert(rows.map(transformToDatabaseRow));
    }
  });
}

function transformToDatabaseRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [toSnakeCase(key), value]),
  );
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

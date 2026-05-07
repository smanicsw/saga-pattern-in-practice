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

  await renameLegacyReservationTables();
}

export async function cleanTestDatabase() {
  const db = getDatabase();

  await db.raw(`
    truncate table
      reservation_products,
      reservations,
      stock,
      products
    restart identity cascade
  `);
}

async function renameLegacyReservationTables() {
  const db = getDatabase();

  const hasLegacyReservationProducts = await db.schema.hasTable(
    "inventory_reservation_items",
  );
  const hasReservationProducts = await db.schema.hasTable(
    "reservation_products",
  );

  if (hasLegacyReservationProducts && !hasReservationProducts) {
    await db.schema.renameTable(
      "inventory_reservation_items",
      "reservation_products",
    );
  }

  const hasLegacyReservations = await db.schema.hasTable(
    "inventory_reservations",
  );
  const hasReservations = await db.schema.hasTable("reservations");

  if (hasLegacyReservations && !hasReservations) {
    await db.schema.renameTable("inventory_reservations", "reservations");
  }
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
  const { items, products, ...rowWithoutNestedFields } = row;

  return Object.fromEntries(
    Object.entries(rowWithoutNestedFields).map(([key, value]) => [
      toSnakeCase(key),
      value,
    ]),
  );
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

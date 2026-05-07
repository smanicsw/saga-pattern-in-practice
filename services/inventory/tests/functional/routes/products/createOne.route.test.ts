import { getDatabase } from "../../../../src/infrastructure/adapters/database/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { setupTestDatabaseHooks } from "../../../utils/database.js";
import type { Knex } from "knex";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("POST /products", () => {
  setupTestDatabaseHooks();

  let app: TestApp;
  let db: Knex;

  beforeAll(async () => {
    app = await startTestApp();
    db = getDatabase();
    api.configure({ baseUrl: app.baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("Success", () => {
    it("should successfully create product", async () => {
      const productToCreate = fixtures.products.createOne({
        product: {
          sku: "SKU-123",
          name: "Keyboard",
          price: 49.99,
        },
      });

      const response = await api.products.createOne({
        body: {
          sku: productToCreate.sku,
          name: productToCreate.name,
          price: productToCreate.price,
        },
      });

      expect(response.status).toEqual(201);
      expect(response.body.success).toEqual(true);

      if (!response.body.success) {
        throw new Error("Expected product creation to succeed.");
      }

      expect(response.body.data).toEqual({
        id: expect.any(String),
        sku: productToCreate.sku,
        name: productToCreate.name,
        description: null,
        price: productToCreate.price,
        currency: "EUR",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const productRows = await db("products").select("*");
      const stockRows = await db("stock").select("*");

      expect(productRows).toHaveLength(1);
      expect(productRows[0]).toMatchObject({
        id: response.body.data.id,
        sku: productToCreate.sku,
        name: productToCreate.name,
        description: null,
        currency: "EUR",
      });
      expect(Number(productRows[0].price)).toEqual(productToCreate.price);

      expect(stockRows).toHaveLength(1);
      expect(stockRows[0]).toMatchObject({
        product_id: response.body.data.id,
        available_quantity: 0,
        reserved_quantity: 0,
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if product payload is invalid", async () => {
      const response = await api.products.createOne({
        body: {
          sku: "",
          name: "Keyboard",
          price: -1,
        },
      });

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        success: false,
        error: "invalid_request",
      });

      const productRows = await db("products").select("*");
      const stockRows = await db("stock").select("*");

      expect(productRows).toHaveLength(0);
      expect(stockRows).toHaveLength(0);
    });
  });
});

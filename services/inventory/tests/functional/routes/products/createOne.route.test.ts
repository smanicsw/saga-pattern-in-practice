import { getDatabase } from "../../../../src/infrastructure/adapters/database/index.js";
import { InventoryEventType } from "../../../../src/entities/inventory-event.entity.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";
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
      const correlationId = "f07b8d0d-7fd4-4d91-91b7-8375903e6d1c";
      const causationId = "a8b16c2d-874f-4dd6-bcdb-19058d15c802";
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
        headers: {
          "x-correlation-id": correlationId,
          "x-causation-id": causationId,
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

      const outboxRows = await db("outbox_events").select("*");

      expect(outboxRows).toHaveLength(1);
      expect(outboxRows[0]).toMatchObject({
        event_type: InventoryEventType.ProductCreated,
        event_version: 1,
        action: "create",
        service: "inventory",
        aggregate_type: "product",
        aggregate_id: response.body.data.id,
        correlation_id: correlationId,
        causation_id: causationId,
        published_at: null,
        dead_lettered_at: null,
        status: "PENDING",
        attempts: 0,
        last_error: null,
      });
      expect(outboxRows[0].payload).toEqual({
        current: response.body.data,
      });
    });

    it("should return the existing product if sku already exists", async () => {
      const product = fixtures.products.createOne({
        product: {
          sku: "SKU-123",
          name: "Keyboard",
          description: null,
          price: 49.99,
        },
      });
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
        },
      });

      await insert({
        products: [product],
        stock: [stock],
      });

      const response = await api.products.createOne({
        body: {
          sku: product.sku,
          name: product.name,
          price: product.price,
        },
      });

      expect(response.status).toEqual(201);
      expect(response.body.success).toEqual(true);

      if (!response.body.success) {
        throw new Error("Expected product creation retry to succeed.");
      }

      expect(response.body.data).toEqual({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });

      const productRows = await db("products").select("*");
      const stockRows = await db("stock").select("*");

      expect(productRows).toHaveLength(1);
      expect(stockRows).toHaveLength(1);
      expect(stockRows[0].product_id).toEqual(product.id);

      const outboxRows = await db("outbox_events").select("*");

      expect(outboxRows).toHaveLength(0);
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

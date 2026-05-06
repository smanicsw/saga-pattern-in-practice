import { startTestApp, type TestApp } from "../../../utils/app.js";
import { setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /products", () => {
  setupTestDatabaseHooks();

  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
    api.configure({ baseUrl: app.baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("success", () => {
    it("should successfully list products", async () => {
      const keyboard = fixtures.products.createOne({
        product: {
          sku: "SKU-KEYBOARD",
          name: "Keyboard",
          price: 49.99,
        },
      });
      const mouse = fixtures.products.createOne({
        product: {
          sku: "SKU-MOUSE",
          name: "Mouse",
          price: 24.99,
        },
      });

      await api.products.createOne({
        body: {
          sku: keyboard.sku,
          name: keyboard.name,
          price: keyboard.price,
        },
      });
      await api.products.createOne({
        body: {
          sku: mouse.sku,
          name: mouse.name,
          price: mouse.price,
        },
      });

      const response = await api.products.findMany();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (!response.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(response.body.data).toEqual({
        items: [
          {
            id: expect.any(String),
            sku: keyboard.sku,
            name: keyboard.name,
            price: keyboard.price,
            currency: "EUR",
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: expect.any(String),
            sku: mouse.sku,
            name: mouse.name,
            price: mouse.price,
            currency: "EUR",
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
        pagination: {
          limit: 20,
          nextCursor: null,
        },
      });
    });

    it("should paginate products with a cursor", async () => {
      const products = fixtures.products.createMany({
        products: [
          {
            sku: "SKU-KEYBOARD",
            name: "Keyboard",
            price: 49.99,
          },
          {
            sku: "SKU-MOUSE",
            name: "Mouse",
            price: 24.99,
          },
          {
            sku: "SKU-MONITOR",
            name: "Monitor",
            price: 199.99,
          },
        ],
      });

      for (const product of products) {
        await api.products.createOne({
          body: {
            sku: product.sku,
            name: product.name,
            price: product.price,
          },
        });
      }

      const firstPageResponse = await api.products.findMany({
        query: {
          limit: "1",
        },
      });

      expect(firstPageResponse.status).toBe(200);
      expect(firstPageResponse.body.success).toBe(true);

      if (!firstPageResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(firstPageResponse.body.data.items).toHaveLength(1);
      expect(firstPageResponse.body.data.pagination).toEqual({
        limit: 1,
        nextCursor: firstPageResponse.body.data.items[0].id,
      });

      const secondPageResponse = await api.products.findMany({
        query: {
          limit: "1",
          cursor: firstPageResponse.body.data.pagination.nextCursor ?? "",
        },
      });

      expect(secondPageResponse.status).toBe(200);
      expect(secondPageResponse.body.success).toBe(true);

      if (!secondPageResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(secondPageResponse.body.data.items).toHaveLength(1);
      expect(secondPageResponse.body.data.items[0].id).not.toBe(
        firstPageResponse.body.data.items[0].id,
      );
      expect(secondPageResponse.body.data.pagination).toEqual({
        limit: 1,
        nextCursor: secondPageResponse.body.data.items[0].id,
      });
    });

    it("should return invalid_request if limit is lower than one", async () => {
      const response = await api.products.findMany({
        query: {
          limit: "0",
        },
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should use the maximum limit if limit is above the maximum", async () => {
      const response = await api.products.findMany({
        query: {
          limit: "101",
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (!response.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(response.body.data.pagination.limit).toBe(100);
    });

    it("should return invalid_request if limit is not a number", async () => {
      const response = await api.products.findMany({
        query: {
          limit: "not-a-number",
        },
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should ignore query params that are not part of the list contract", async () => {
      const keyboard = fixtures.products.createOne({
        product: {
          sku: "SKU-KEYBOARD",
          name: "Keyboard",
          price: 49.99,
        },
      });
      const mouse = fixtures.products.createOne({
        product: {
          sku: "SKU-MOUSE",
          name: "Mouse",
          price: 24.99,
        },
      });

      await api.products.createOne({
        body: {
          sku: keyboard.sku,
          name: keyboard.name,
          price: keyboard.price,
        },
      });
      await api.products.createOne({
        body: {
          sku: mouse.sku,
          name: mouse.name,
          price: mouse.price,
        },
      });

      const response = await api.products.findMany({
        query: {
          sku: mouse.sku,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (!response.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(response.body.data.items).toEqual([
        expect.objectContaining({
          sku: keyboard.sku,
        }),
        expect.objectContaining({
          sku: mouse.sku,
        }),
      ]);
      expect(response.body.data.pagination).toEqual({
        limit: 20,
        nextCursor: null,
      });
    });
  });

  describe("error", () => {
    it("should return invalid_request if cursor is invalid", async () => {
      const response = await api.products.findMany({
        query: {
          cursor: "not-a-valid-cursor",
        },
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });
  });
});

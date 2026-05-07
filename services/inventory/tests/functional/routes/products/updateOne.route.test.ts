import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("PATCH /products/:productId", () => {
  setupTestDatabaseHooks();

  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
    api.configure({ baseUrl: app.baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("Success", () => {
    it("should successfully update only provided product fields", async () => {
      const product = fixtures.products.createOne({
        product: {
          name: "Keyboard",
          description: "Mechanical keyboard",
          price: 49.99,
          updatedAt: "2026-05-05T10:00:00.000Z",
        },
      });

      await insert({
        products: [product],
      });

      const updateOneResponse = await api.products.updateOne({
        productId: product.id,
        body: {
          name: "Wireless Keyboard",
          price: 59.99,
        },
      });

      expect(updateOneResponse.status).toEqual(200);
      expect(updateOneResponse.body.success).toEqual(true);

      if (!updateOneResponse.body.success) {
        throw new Error("Expected product update to succeed.");
      }

      expect(updateOneResponse.body.data).toEqual({
        id: product.id,
        sku: product.sku,
        name: "Wireless Keyboard",
        description: product.description,
        price: 59.99,
        currency: product.currency,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
      expect(updateOneResponse.body.data.updatedAt).not.toEqual(
        product.updatedAt,
      );

      const findOneResponse = await api.products.findOne({
        productId: product.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected product lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual(updateOneResponse.body.data);
    });

    it("should successfully clear product description", async () => {
      const product = fixtures.products.createOne({
        product: {
          description: "Mechanical keyboard",
        },
      });

      await insert({
        products: [product],
      });

      const updateOneResponse = await api.products.updateOne({
        productId: product.id,
        body: {
          description: null,
        },
      });

      expect(updateOneResponse.status).toEqual(200);
      expect(updateOneResponse.body.success).toEqual(true);

      if (!updateOneResponse.body.success) {
        throw new Error("Expected product update to succeed.");
      }

      expect(updateOneResponse.body.data.description).toEqual(null);
      expect(updateOneResponse.body.data.name).toEqual(product.name);
      expect(updateOneResponse.body.data.price).toEqual(product.price);
    });

    it("should return the current product without updating if payload does not change it", async () => {
      const product = fixtures.products.createOne({
        product: {
          name: "Keyboard",
          description: "Mechanical keyboard",
          price: 49.99,
          updatedAt: "2026-05-05T10:00:00.000Z",
        },
      });

      await insert({
        products: [product],
      });

      const updateOneResponse = await api.products.updateOne({
        productId: product.id,
        body: {
          name: product.name,
          description: product.description,
          price: product.price,
        },
      });

      expect(updateOneResponse.status).toEqual(200);
      expect(updateOneResponse.body.success).toEqual(true);

      if (!updateOneResponse.body.success) {
        throw new Error("Expected product update to succeed.");
      }

      expect(updateOneResponse.body.data).toEqual({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if product id is invalid", async () => {
      const updateOneResponse = await api.products.updateOne({
        productId: "not-a-product-id",
        body: {
          name: "Wireless Keyboard",
        },
      });

      expect(updateOneResponse.status).toEqual(400);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return invalid_request if product update payload is empty", async () => {
      const updateOneResponse = await api.products.updateOne({
        productId: randomUUID(),
        body: {},
      });

      expect(updateOneResponse.status).toEqual(400);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return invalid_request if product update payload is invalid", async () => {
      const updateOneResponse = await api.products.updateOne({
        productId: randomUUID(),
        body: {
          price: -1,
        },
      });

      expect(updateOneResponse.status).toEqual(400);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return product_not_found if product does not exist", async () => {
      const updateOneResponse = await api.products.updateOne({
        productId: randomUUID(),
        body: {
          name: "Wireless Keyboard",
        },
      });

      expect(updateOneResponse.status).toEqual(404);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "product_not_found",
      });
    });
  });
});

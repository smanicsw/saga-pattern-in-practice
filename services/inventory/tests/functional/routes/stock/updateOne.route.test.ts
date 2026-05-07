import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("PATCH /stock/:productId", () => {
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
    it("should successfully update stock available quantity", async () => {
      const product = fixtures.products.createOne();
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
          availableQuantity: 10,
          reservedQuantity: 2,
          updatedAt: "2026-05-05T10:00:00.000Z",
        },
      });

      await insert({
        products: [product],
        stock: [stock],
      });

      const updateOneResponse = await api.stock.updateOne({
        productId: product.id,
        body: {
          availableQuantity: 25,
        },
      });

      expect(updateOneResponse.status).toEqual(200);
      expect(updateOneResponse.body.success).toEqual(true);

      if (!updateOneResponse.body.success) {
        throw new Error("Expected stock update to succeed.");
      }

      expect(updateOneResponse.body.data).toEqual({
        id: stock.id,
        productId: product.id,
        availableQuantity: 25,
        reservedQuantity: 2,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
      expect(updateOneResponse.body.data.updatedAt).not.toEqual(stock.updatedAt);

      const findOneResponse = await api.stock.findOne({
        productId: product.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected stock lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual(updateOneResponse.body.data);
    });
  });

  describe("Error", () => {
    it("should return invalid_request if product id is invalid", async () => {
      const updateOneResponse = await api.stock.updateOne({
        productId: "not-a-product-id",
        body: {
          availableQuantity: 25,
        },
      });

      expect(updateOneResponse.status).toEqual(400);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return invalid_request if available quantity is invalid", async () => {
      const updateOneResponse = await api.stock.updateOne({
        productId: randomUUID(),
        body: {
          availableQuantity: -1,
        },
      });

      expect(updateOneResponse.status).toEqual(400);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return stock_not_found if stock does not exist", async () => {
      const updateOneResponse = await api.stock.updateOne({
        productId: randomUUID(),
        body: {
          availableQuantity: 25,
        },
      });

      expect(updateOneResponse.status).toEqual(404);
      expect(updateOneResponse.body).toEqual({
        success: false,
        error: "stock_not_found",
      });
    });
  });
});

import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /stock/:productId", () => {
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
    it("should successfully find stock by product id", async () => {
      const product = fixtures.products.createOne();
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
          availableQuantity: 10,
          reservedQuantity: 2,
        },
      });

      await insert({
        products: [product],
        stock: [stock],
      });

      const findOneResponse = await api.stock.findOne({
        productId: product.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected stock lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual({
        id: stock.id,
        productId: product.id,
        availableQuantity: 10,
        reservedQuantity: 2,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if product id is invalid", async () => {
      const findOneResponse = await api.stock.findOne({
        productId: "not-a-product-id",
      });

      expect(findOneResponse.status).toEqual(400);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return stock_not_found if stock does not exist", async () => {
      const findOneResponse = await api.stock.findOne({
        productId: randomUUID(),
      });

      expect(findOneResponse.status).toEqual(404);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "stock_not_found",
      });
    });
  });
});

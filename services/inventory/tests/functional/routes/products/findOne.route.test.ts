import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /products/:productId", () => {
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
    it("should successfully find a product", async () => {
      const [product] = fixtures.products.createMany({
        products: [{}],
      });

      await insert({
        products: [product],
      });

      const findOneResponse = await api.products.findOne({
        productId: product.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected product lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual({
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        currency: product.currency,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if product id is invalid", async () => {
      const findOneResponse = await api.products.findOne({
        productId: "not-a-product-id",
      });

      expect(findOneResponse.status).toEqual(400);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return not_found if product does not exist", async () => {
      const findOneResponse = await api.products.findOne({
        productId: randomUUID(),
      });

      expect(findOneResponse.status).toEqual(404);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "product_not_found",
      });
    });
  });
});

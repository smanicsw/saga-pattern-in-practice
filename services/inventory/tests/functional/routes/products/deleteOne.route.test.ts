import { randomUUID } from "node:crypto";

import { getDatabase } from "../../../../src/infrastructure/adapters/database/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("DELETE /products/:productId", () => {
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
    it("should successfully delete a product", async () => {
      const [product] = fixtures.products.createMany({
        products: [{}],
      });
      const stockLevel = fixtures.stock.createOne({
        stockLevel: {
          productId: product.id,
          availableQuantity: 10,
          reservedQuantity: 2,
        },
      });

      await insert({
        products: [product],
        stock_levels: [stockLevel],
      });

      const deleteOneResponse = await api.products.deleteOne({
        productId: product.id,
      });

      expect(deleteOneResponse.status).toBe(204);
      expect(deleteOneResponse.body).toBeUndefined();

      const db = getDatabase();
      const productRows = await db("products").select("*");
      const stockLevelRows = await db("stock_levels").select("*");

      expect(productRows).toHaveLength(0);
      expect(stockLevelRows).toHaveLength(0);
    });

    it("should return no content if product does not exist", async () => {
      const deleteOneResponse = await api.products.deleteOne({
        productId: randomUUID(),
      });

      expect(deleteOneResponse.status).toBe(204);
      expect(deleteOneResponse.body).toBeUndefined();
    });
  });

  describe("error", () => {
    it("should return invalid_request if product id is invalid", async () => {
      const deleteOneResponse = await api.products.deleteOne({
        productId: "not-a-product-id",
      });

      expect(deleteOneResponse.status).toBe(400);
      expect(deleteOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });
  });
});

import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
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

  describe("Success", () => {
    it("should successfully list products", async () => {
      const products = fixtures.products.createMany({
        products: [
          {
            createdAt: "2026-05-05T10:00:00.000Z",
            updatedAt: "2026-05-05T10:00:00.000Z",
          },
          {
            createdAt: "2026-05-05T10:00:00.001Z",
            updatedAt: "2026-05-05T10:00:00.001Z",
          },
        ],
      });

      await insert({ products });

      const findManyResponse = await api.products.findMany();

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(findManyResponse.body.data).toEqual({
        items: [
          {
            id: products[0].id,
            sku: products[0].sku,
            name: products[0].name,
            price: products[0].price,
            currency: products[0].currency,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
          {
            id: products[1].id,
            sku: products[1].sku,
            name: products[1].name,
            price: products[1].price,
            currency: products[1].currency,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
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
        products: [{}, {}, {}],
      });

      await insert({ products });

      const firstPageResponse = await api.products.findMany({
        query: {
          limit: "1",
        },
      });

      expect(firstPageResponse.status).toEqual(200);
      expect(firstPageResponse.body.success).toEqual(true);

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

      expect(secondPageResponse.status).toEqual(200);
      expect(secondPageResponse.body.success).toEqual(true);

      if (!secondPageResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(secondPageResponse.body.data.items).toHaveLength(1);
      expect(secondPageResponse.body.data.items[0].id).not.toEqual(
        firstPageResponse.body.data.items[0].id,
      );
      expect(secondPageResponse.body.data.pagination).toEqual({
        limit: 1,
        nextCursor: secondPageResponse.body.data.items[0].id,
      });
    });

    it("should return invalid_request if limit is lower than one", async () => {
      const findManyResponse = await api.products.findMany({
        query: {
          limit: "0",
        },
      });

      expect(findManyResponse.status).toEqual(400);
      expect(findManyResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should use the maximum limit if limit is above the maximum", async () => {
      const findManyResponse = await api.products.findMany({
        query: {
          limit: "101",
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(findManyResponse.body.data.pagination.limit).toEqual(100);
    });

    it("should return invalid_request if limit is not a number", async () => {
      const findManyResponse = await api.products.findMany({
        query: {
          limit: "not-a-number",
        },
      });

      expect(findManyResponse.status).toEqual(400);
      expect(findManyResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should ignore query params that are not part of the list contract", async () => {
      const products = fixtures.products.createMany({
        products: [
          {
            createdAt: "2026-05-05T10:00:00.000Z",
            updatedAt: "2026-05-05T10:00:00.000Z",
          },
          {
            createdAt: "2026-05-05T10:00:00.001Z",
            updatedAt: "2026-05-05T10:00:00.001Z",
          },
        ],
      });

      await insert({ products });

      const findManyResponse = await api.products.findMany({
        query: {
          sku: products[0].sku,
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected product list to succeed.");
      }

      expect(findManyResponse.body.data).toEqual({
        items: [
          {
            id: products[0].id,
            sku: products[0].sku,
            name: products[0].name,
            price: products[0].price,
            currency: products[0].currency,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
          {
            id: products[1].id,
            sku: products[1].sku,
            name: products[1].name,
            price: products[1].price,
            currency: products[1].currency,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
        ],
        pagination: {
          limit: 20,
          nextCursor: null,
        },
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if cursor is invalid", async () => {
      const findManyResponse = await api.products.findMany({
        query: {
          cursor: "not-a-valid-cursor",
        },
      });

      expect(findManyResponse.status).toEqual(400);
      expect(findManyResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });
  });
});

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /api/v1/order/orders", () => {
  setupTestDatabaseHooks();

  let app: TestApp;

  beforeAll(async () => {
    app = await startTestApp();
    api.client.configure({ baseUrl: app.baseUrl });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("Success", () => {
    it("should successfully list orders with item snapshots", async () => {
      const orders = fixtures.orders.createMany({
        orders: [
          {
            createdAt: "2026-05-05T10:00:00.000Z",
            updatedAt: "2026-05-05T10:00:00.000Z",
            items: [{}],
          },
          {
            createdAt: "2026-05-05T10:00:00.001Z",
            updatedAt: "2026-05-05T10:00:00.001Z",
            items: [{}],
          },
        ],
      });

      await insert({
        orders: orders.map((order) => ({
          id: order.id,
          customer_id: order.customerId,
          status: order.status,
          total_amount: order.totalAmount,
          currency: order.currency,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        })),
        order_items: orders.flatMap((order) =>
          order.items.map((item) => ({
            id: item.id,
            order_id: item.orderId,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price_snapshot: item.unitPriceSnapshot,
            line_total_snapshot: item.lineTotalSnapshot,
            sku_snapshot: item.skuSnapshot,
            name_snapshot: item.nameSnapshot,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
          })),
        ),
      });

      const findManyResponse = await api.orders.findMany();

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected order list to succeed.");
      }

      expect(findManyResponse.body.data).toEqual({
        items: orders.map((order) => ({
          id: order.id,
          customerId: order.customerId,
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
          items: order.items.map((item) => ({
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceSnapshot: item.unitPriceSnapshot,
            lineTotalSnapshot: item.lineTotalSnapshot,
            skuSnapshot: item.skuSnapshot,
            nameSnapshot: item.nameSnapshot,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          })),
          createdAt: expect.stringMatching(ISO_DATE_REGEX),
          updatedAt: expect.stringMatching(ISO_DATE_REGEX),
        })),
        pagination: {
          limit: 20,
          nextCursor: null,
        },
      });
    });

    it("should filter orders by customerId and status", async () => {
      const customerId = "customer-001";
      const orders = fixtures.orders.createMany({
        orders: [
          {
            customerId,
            status: "CONFIRMED",
          },
          {
            customerId,
            status: "PENDING",
          },
          {
            status: "CONFIRMED",
          },
        ],
      });

      await insert({
        orders: orders.map((order) => ({
          id: order.id,
          customer_id: order.customerId,
          status: order.status,
          total_amount: order.totalAmount,
          currency: order.currency,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        })),
      });

      const findManyResponse = await api.orders.findMany({
        query: {
          customerId,
          status: "CONFIRMED",
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected order list to succeed.");
      }

      expect(findManyResponse.body.data.items).toHaveLength(1);
      expect(findManyResponse.body.data.items[0].id).toEqual(orders[0].id);
      expect(findManyResponse.body.data.pagination).toEqual({
        limit: 20,
        nextCursor: null,
      });
    });

    it("should paginate orders with a cursor", async () => {
      const orders = fixtures.orders.createMany({
        orders: [{}, {}, {}],
      });

      await insert({
        orders: orders.map((order) => ({
          id: order.id,
          customer_id: order.customerId,
          status: order.status,
          total_amount: order.totalAmount,
          currency: order.currency,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        })),
      });

      const firstPageResponse = await api.orders.findMany({
        query: {
          limit: "1",
        },
      });

      expect(firstPageResponse.status).toEqual(200);
      expect(firstPageResponse.body.success).toEqual(true);

      if (!firstPageResponse.body.success) {
        throw new Error("Expected order list to succeed.");
      }

      expect(firstPageResponse.body.data.items).toHaveLength(1);
      expect(firstPageResponse.body.data.pagination).toEqual({
        limit: 1,
        nextCursor: firstPageResponse.body.data.items[0].id,
      });

      const secondPageResponse = await api.orders.findMany({
        query: {
          limit: "1",
          cursor: firstPageResponse.body.data.pagination.nextCursor ?? "",
        },
      });

      expect(secondPageResponse.status).toEqual(200);
      expect(secondPageResponse.body.success).toEqual(true);

      if (!secondPageResponse.body.success) {
        throw new Error("Expected order list to succeed.");
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

    it("should use the maximum limit if limit is above the maximum", async () => {
      const findManyResponse = await api.orders.findMany({
        query: {
          limit: "101",
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected order list to succeed.");
      }

      expect(findManyResponse.body.data.pagination.limit).toEqual(100);
    });
  });

  describe("Error", () => {
    it("should return invalid_request if limit is lower than one", async () => {
      const findManyResponse = await api.orders.findMany({
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

    it("should return invalid_request if limit is not a number", async () => {
      const findManyResponse = await api.orders.findMany({
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

    it("should return invalid_request if cursor is invalid", async () => {
      const findManyResponse = await api.orders.findMany({
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

    it("should return invalid_request if status is invalid", async () => {
      const findManyResponse = await api.orders.findMany({
        query: {
          status: "FAILED",
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

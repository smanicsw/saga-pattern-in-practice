import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /api/v1/order/orders/:orderId", () => {
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
    it("should successfully find an order with item snapshots", async () => {
      const order = fixtures.orders.createOne({
        items: [{}, {}],
      });

      await insert({
        orders: [
          {
            id: order.id,
            customer_id: order.customerId,
            status: order.status,
            total_amount: order.totalAmount,
            currency: order.currency,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
          },
        ],
        order_items: order.items.map((item) => ({
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
      });

      const findOneResponse = await api.orders.findOne({
        orderId: order.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected order lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual({
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
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if order id is invalid", async () => {
      const findOneResponse = await api.orders.findOne({
        orderId: "not-an-order-id",
      });

      expect(findOneResponse.status).toEqual(400);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return order_not_found if order does not exist", async () => {
      const findOneResponse = await api.orders.findOne({
        orderId: randomUUID(),
      });

      expect(findOneResponse.status).toEqual(404);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "order_not_found",
      });
    });
  });
});

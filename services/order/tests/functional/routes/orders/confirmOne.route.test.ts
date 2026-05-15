import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import type { Order } from "../../../../src/entities/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("POST /api/v1/order/orders/:orderId/confirm", () => {
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
    it("should confirm a pending order", async () => {
      const order = fixtures.orders.createOne({
        items: [{}, {}],
      });

      await insertOrder({ order });

      const confirmOneResponse = await api.orders.confirmOne({
        orderId: order.id,
      });

      expect(confirmOneResponse.status).toEqual(200);
      expect(confirmOneResponse.body.success).toEqual(true);

      if (!confirmOneResponse.body.success) {
        throw new Error("Expected order confirmation to succeed.");
      }

      expect(confirmOneResponse.body.data).toEqual({
        ...buildExpectedOrder({ order }),
        status: "CONFIRMED",
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });

    it("should be idempotent if order is already confirmed", async () => {
      const order = fixtures.orders.createOne({
        order: {
          status: "CONFIRMED",
        },
        items: [{}],
      });

      await insertOrder({ order });

      const confirmOneResponse = await api.orders.confirmOne({
        orderId: order.id,
      });

      expect(confirmOneResponse.status).toEqual(200);
      expect(confirmOneResponse.body.success).toEqual(true);

      if (!confirmOneResponse.body.success) {
        throw new Error("Expected order confirmation to succeed.");
      }

      expect(confirmOneResponse.body.data).toEqual(buildExpectedOrder({ order }));
    });
  });

  describe("Error", () => {
    it("should return invalid_request if order id is invalid", async () => {
      const confirmOneResponse = await api.orders.confirmOne({
        orderId: "not-an-order-id",
      });

      expect(confirmOneResponse.status).toEqual(400);
      expect(confirmOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return order_not_found if order does not exist", async () => {
      const confirmOneResponse = await api.orders.confirmOne({
        orderId: randomUUID(),
      });

      expect(confirmOneResponse.status).toEqual(404);
      expect(confirmOneResponse.body).toEqual({
        success: false,
        error: "order_not_found",
      });
    });

    it("should return invalid_order_status if order is cancelled", async () => {
      const order = fixtures.orders.createOne({
        order: {
          status: "CANCELLED",
        },
      });

      await insertOrder({ order });

      const confirmOneResponse = await api.orders.confirmOne({
        orderId: order.id,
      });

      expect(confirmOneResponse.status).toEqual(409);
      expect(confirmOneResponse.body).toEqual({
        success: false,
        error: "invalid_order_status",
      });
    });
  });
});

async function insertOrder({ order }: { order: Order }) {
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
}

function buildExpectedOrder({ order }: { order: Order }) {
  return {
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
  };
}

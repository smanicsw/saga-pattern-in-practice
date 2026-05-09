import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /api/v1/payments/:paymentId", () => {
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
    it("should successfully find a payment", async () => {
      const payment = fixtures.payments.createOne();

      await insert({
        payments: [
          {
            id: payment.id,
            order_id: payment.orderId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            provider_ref: payment.providerRef,
            failure_reason: payment.failureReason,
            created_at: payment.createdAt,
            updated_at: payment.updatedAt,
          },
        ],
      });

      const findOneResponse = await api.payments.findOne({
        paymentId: payment.id,
      });

      expect(findOneResponse.status).toEqual(200);
      expect(findOneResponse.body.success).toEqual(true);

      if (!findOneResponse.body.success) {
        throw new Error("Expected payment lookup to succeed.");
      }

      expect(findOneResponse.body.data).toEqual({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        providerRef: payment.providerRef,
        failureReason: payment.failureReason,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if payment id is invalid", async () => {
      const findOneResponse = await api.payments.findOne({
        paymentId: "not-a-payment-id",
      });

      expect(findOneResponse.status).toEqual(400);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return payment_not_found if payment does not exist", async () => {
      const findOneResponse = await api.payments.findOne({
        paymentId: randomUUID(),
      });

      expect(findOneResponse.status).toEqual(404);
      expect(findOneResponse.body).toEqual({
        success: false,
        error: "payment_not_found",
      });
    });
  });
});

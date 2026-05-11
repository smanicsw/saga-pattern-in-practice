import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("POST /api/v1/payments/:paymentId/refund", () => {
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
    it("should refund an authorized payment", async () => {
      const payment = fixtures.payments.createOne({
        payment: {
          status: "AUTHORIZED",
          providerRef: "fake-auth-ref",
        },
      });

      await insertPayment({ payment });

      const refundResponse = await api.payments.refund({
        paymentId: payment.id,
        body: {
          reason: "ORDER_SAGA_FAILED",
        },
      });

      expect(refundResponse.status).toEqual(200);
      expect(refundResponse.body.success).toEqual(true);

      if (!refundResponse.body.success) {
        throw new Error("Expected payment refund to succeed.");
      }

      expect(refundResponse.body.data).toEqual({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: "REFUNDED",
        providerRef: payment.providerRef,
        failureReason: payment.failureReason,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });

    it("should return the existing payment when refund is retried", async () => {
      const payment = fixtures.payments.createOne({
        payment: {
          status: "REFUNDED",
          providerRef: "fake-auth-ref",
        },
      });

      await insertPayment({ payment });

      const refundResponse = await api.payments.refund({
        paymentId: payment.id,
        body: {
          reason: "ORDER_SAGA_FAILED",
        },
      });

      expect(refundResponse.status).toEqual(200);
      expect(refundResponse.body.success).toEqual(true);

      if (!refundResponse.body.success) {
        throw new Error("Expected repeated payment refund to succeed.");
      }

      expect(refundResponse.body.data).toEqual({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        status: "REFUNDED",
        providerRef: payment.providerRef,
        failureReason: payment.failureReason,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if payment id is invalid", async () => {
      const refundResponse = await api.payments.refund({
        paymentId: "not-a-payment-id",
      });

      expect(refundResponse.status).toEqual(400);
      expect(refundResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return payment_not_found if payment does not exist", async () => {
      const refundResponse = await api.payments.refund({
        paymentId: randomUUID(),
      });

      expect(refundResponse.status).toEqual(404);
      expect(refundResponse.body).toEqual({
        success: false,
        error: "payment_not_found",
      });
    });

    it("should return invalid_payment_status if payment is not authorized", async () => {
      const payment = fixtures.payments.createOne({
        payment: {
          status: "FAILED",
          providerRef: null,
          failureReason: {
            code: "card_declined",
          },
        },
      });

      await insertPayment({ payment });

      const refundResponse = await api.payments.refund({
        paymentId: payment.id,
      });

      expect(refundResponse.status).toEqual(409);
      expect(refundResponse.body).toEqual({
        success: false,
        error: "invalid_payment_status",
      });
    });

    it("should return invalid_request if body is invalid", async () => {
      const payment = fixtures.payments.createOne({
        payment: {
          status: "AUTHORIZED",
        },
      });

      await insertPayment({ payment });

      const refundResponse = await api.payments.refund({
        paymentId: payment.id,
        body: {
          reason: "",
        },
      });

      expect(refundResponse.status).toEqual(400);
      expect(refundResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });
  });
});

async function insertPayment({
  payment,
}: {
  payment: ReturnType<typeof fixtures.payments.createOne>;
}) {
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
}

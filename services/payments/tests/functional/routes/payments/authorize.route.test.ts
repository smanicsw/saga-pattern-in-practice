import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";

describe("POST /api/v1/payments/authorize", () => {
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
    it("should authorize a new payment", async () => {
      const body = {
        orderId: randomUUID(),
        amount: 149.99,
        currency: "EUR",
        paymentMethodToken: "tok_approved",
      };

      const authorizeResponse = await api.payments.authorize({
        body,
      });

      expect(authorizeResponse.status).toEqual(200);
      expect(authorizeResponse.body.success).toEqual(true);

      if (!authorizeResponse.body.success) {
        throw new Error("Expected payment authorization to succeed.");
      }

      expect(authorizeResponse.body.data).toEqual({
        id: expect.any(String),
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency,
        status: "AUTHORIZED",
        providerRef: expect.stringMatching(/^fake-auth-/),
        failureReason: null,
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });

    it("should fail payment authorization for a declined token", async () => {
      const body = {
        orderId: randomUUID(),
        amount: 149.99,
        currency: "EUR",
        paymentMethodToken: "card_declined",
      };

      const authorizeResponse = await api.payments.authorize({
        body,
      });

      expect(authorizeResponse.status).toEqual(200);
      expect(authorizeResponse.body.success).toEqual(true);

      if (!authorizeResponse.body.success) {
        throw new Error("Expected declined payment authorization to resolve.");
      }

      expect(authorizeResponse.body.data).toEqual({
        id: expect.any(String),
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency,
        status: "FAILED",
        providerRef: null,
        failureReason: {
          code: "card_declined",
          message: "Fake provider declined the payment.",
        },
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });

    it("should return the existing payment when authorization is retried", async () => {
      const body = {
        orderId: randomUUID(),
        amount: 149.99,
        currency: "EUR",
        paymentMethodToken: "tok_approved",
      };

      const firstAuthorizeResponse = await api.payments.authorize({
        body,
      });

      expect(firstAuthorizeResponse.status).toEqual(200);
      expect(firstAuthorizeResponse.body.success).toEqual(true);

      if (!firstAuthorizeResponse.body.success) {
        throw new Error("Expected first payment authorization to succeed.");
      }

      const retryAuthorizeResponse = await api.payments.authorize({
        body,
      });

      expect(retryAuthorizeResponse.status).toEqual(200);
      expect(retryAuthorizeResponse.body).toEqual(firstAuthorizeResponse.body);
    });
  });

  describe("Error", () => {
    it("should return payment_conflict if retry changes amount", async () => {
      const orderId = randomUUID();

      await api.payments.authorize({
        body: {
          orderId,
          amount: 149.99,
          currency: "EUR",
          paymentMethodToken: "tok_approved",
        },
      });

      const authorizeResponse = await api.payments.authorize({
        body: {
          orderId,
          amount: 150,
          currency: "EUR",
          paymentMethodToken: "tok_approved",
        },
      });

      expect(authorizeResponse.status).toEqual(409);
      expect(authorizeResponse.body).toEqual({
        success: false,
        error: "payment_conflict",
      });
    });

    it("should return invalid_request if body is invalid", async () => {
      const authorizeResponse = await api.payments.authorize({
        body: {
          orderId: "not-an-order-id",
          amount: 149.99,
          currency: "EUR",
        },
      });

      expect(authorizeResponse.status).toEqual(400);
      expect(authorizeResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });
  });
});

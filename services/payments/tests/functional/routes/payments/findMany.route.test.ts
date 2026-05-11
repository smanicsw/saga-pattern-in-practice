import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /api/v1/payments", () => {
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
    it("should successfully list payments", async () => {
      const payments = fixtures.payments.createMany({
        payments: [
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

      await insert({
        payments: payments.map((payment) => ({
          id: payment.id,
          order_id: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider_ref: payment.providerRef,
          failure_reason: payment.failureReason,
          created_at: payment.createdAt,
          updated_at: payment.updatedAt,
        })),
      });

      const findManyResponse = await api.payments.findMany();

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected payment list to succeed.");
      }

      expect(findManyResponse.body.data).toEqual({
        items: [
          {
            id: payments[0].id,
            orderId: payments[0].orderId,
            amount: payments[0].amount,
            currency: payments[0].currency,
            status: payments[0].status,
            providerRef: payments[0].providerRef,
            failureReason: payments[0].failureReason,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
          {
            id: payments[1].id,
            orderId: payments[1].orderId,
            amount: payments[1].amount,
            currency: payments[1].currency,
            status: payments[1].status,
            providerRef: payments[1].providerRef,
            failureReason: payments[1].failureReason,
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

    it("should filter payments by orderId and status", async () => {
      const orderId = "1dd783bb-fc6c-4f95-a593-70991a19548d";
      const payments = fixtures.payments.createMany({
        payments: [
          {
            orderId,
            status: "AUTHORIZED",
          },
          {
            status: "FAILED",
          },
          {
            status: "AUTHORIZED",
          },
        ],
      });

      await insert({
        payments: payments.map((payment) => ({
          id: payment.id,
          order_id: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider_ref: payment.providerRef,
          failure_reason: payment.failureReason,
          created_at: payment.createdAt,
          updated_at: payment.updatedAt,
        })),
      });

      const findManyResponse = await api.payments.findMany({
        query: {
          orderId,
          status: "AUTHORIZED",
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected payment list to succeed.");
      }

      expect(findManyResponse.body.data.items).toHaveLength(1);
      expect(findManyResponse.body.data.items[0].id).toEqual(payments[0].id);
      expect(findManyResponse.body.data.pagination).toEqual({
        limit: 20,
        nextCursor: null,
      });
    });

    it("should paginate payments with a cursor", async () => {
      const payments = fixtures.payments.createMany({
        payments: [{}, {}, {}],
      });

      await insert({
        payments: payments.map((payment) => ({
          id: payment.id,
          order_id: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider_ref: payment.providerRef,
          failure_reason: payment.failureReason,
          created_at: payment.createdAt,
          updated_at: payment.updatedAt,
        })),
      });

      const firstPageResponse = await api.payments.findMany({
        query: {
          limit: "1",
        },
      });

      expect(firstPageResponse.status).toEqual(200);
      expect(firstPageResponse.body.success).toEqual(true);

      if (!firstPageResponse.body.success) {
        throw new Error("Expected payment list to succeed.");
      }

      expect(firstPageResponse.body.data.items).toHaveLength(1);
      expect(firstPageResponse.body.data.pagination).toEqual({
        limit: 1,
        nextCursor: firstPageResponse.body.data.items[0].id,
      });

      const secondPageResponse = await api.payments.findMany({
        query: {
          limit: "1",
          cursor: firstPageResponse.body.data.pagination.nextCursor ?? "",
        },
      });

      expect(secondPageResponse.status).toEqual(200);
      expect(secondPageResponse.body.success).toEqual(true);

      if (!secondPageResponse.body.success) {
        throw new Error("Expected payment list to succeed.");
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
      const findManyResponse = await api.payments.findMany({
        query: {
          limit: "101",
        },
      });

      expect(findManyResponse.status).toEqual(200);
      expect(findManyResponse.body.success).toEqual(true);

      if (!findManyResponse.body.success) {
        throw new Error("Expected payment list to succeed.");
      }

      expect(findManyResponse.body.data.pagination.limit).toEqual(100);
    });
  });

  describe("Error", () => {
    it("should return invalid_request if limit is lower than one", async () => {
      const findManyResponse = await api.payments.findMany({
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
      const findManyResponse = await api.payments.findMany({
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
      const findManyResponse = await api.payments.findMany({
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

    it("should return invalid_request if orderId is invalid", async () => {
      const findManyResponse = await api.payments.findMany({
        query: {
          orderId: "not-a-valid-order-id",
        },
      });

      expect(findManyResponse.status).toEqual(400);
      expect(findManyResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return invalid_request if status is invalid", async () => {
      const findManyResponse = await api.payments.findMany({
        query: {
          status: "CAPTURED",
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

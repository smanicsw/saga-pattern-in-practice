import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("GET /reservations/by-order/:orderId", () => {
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
    it("should successfully find a reservation with products by order id", async () => {
      const products = fixtures.products.createMany({
        products: [{}, {}],
      });
      const reservation = fixtures.reservations.createOne();
      const reservationProducts = [
        fixtures.reservations.createItem({
          reservationProduct: {
            reservationId: reservation.id,
            productId: products[0].id,
            quantity: 2,
            createdAt: "2026-05-05T10:00:00.000Z",
            updatedAt: "2026-05-05T10:00:00.000Z",
          },
        }),
        fixtures.reservations.createItem({
          reservationProduct: {
            reservationId: reservation.id,
            productId: products[1].id,
            quantity: 3,
            createdAt: "2026-05-05T10:00:00.001Z",
            updatedAt: "2026-05-05T10:00:00.001Z",
          },
        }),
      ];

      await insert({
        products,
        reservations: [reservation],
        reservation_products: reservationProducts,
      });

      const findOneByOrderIdResponse =
        await api.reservations.findOneByOrderId({
          orderId: reservation.orderId,
        });

      expect(findOneByOrderIdResponse.status).toEqual(200);
      expect(findOneByOrderIdResponse.body.success).toEqual(true);

      if (!findOneByOrderIdResponse.body.success) {
        throw new Error("Expected reservation lookup to succeed.");
      }

      expect(findOneByOrderIdResponse.body.data).toEqual({
        id: reservation.id,
        orderId: reservation.orderId,
        status: reservation.status,
        products: [
          {
            id: reservationProducts[0].id,
            reservationId: reservation.id,
            productId: products[0].id,
            quantity: 2,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
          {
            id: reservationProducts[1].id,
            reservationId: reservation.id,
            productId: products[1].id,
            quantity: 3,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });
  });

  describe("Error", () => {
    it("should return invalid_request if order id is invalid", async () => {
      const findOneByOrderIdResponse =
        await api.reservations.findOneByOrderId({
          orderId: "not-an-order-id",
        });

      expect(findOneByOrderIdResponse.status).toEqual(400);
      expect(findOneByOrderIdResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return reservation_not_found if order does not have a reservation", async () => {
      const findOneByOrderIdResponse =
        await api.reservations.findOneByOrderId({
          orderId: randomUUID(),
        });

      expect(findOneByOrderIdResponse.status).toEqual(404);
      expect(findOneByOrderIdResponse.body).toEqual({
        success: false,
        error: "reservation_not_found",
      });
    });
  });
});

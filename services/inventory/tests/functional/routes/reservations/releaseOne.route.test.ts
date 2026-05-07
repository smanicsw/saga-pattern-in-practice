import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("POST /reservations/:reservationId/release", () => {
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
    it("should successfully release a pending reservation and restore stock", async () => {
      const products = fixtures.products.createMany({
        products: [{}, {}],
      });
      const stock = [
        fixtures.stock.createOne({
          stock: {
            productId: products[0].id,
            availableQuantity: 8,
            reservedQuantity: 3,
          },
        }),
        fixtures.stock.createOne({
          stock: {
            productId: products[1].id,
            availableQuantity: 2,
            reservedQuantity: 3,
          },
        }),
      ];
      const reservation = fixtures.reservations.createOne({
        reservation: {
          status: "PENDING",
        },
      });
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
        stock,
        reservations: [reservation],
        reservation_products: reservationProducts,
      });

      const releaseOneResponse = await api.reservations.releaseOne({
        reservationId: reservation.id,
      });

      expect(releaseOneResponse.status).toEqual(200);
      expect(releaseOneResponse.body.success).toEqual(true);

      if (!releaseOneResponse.body.success) {
        throw new Error("Expected reservation release to succeed.");
      }

      expect(releaseOneResponse.body.data).toEqual({
        id: reservation.id,
        orderId: reservation.orderId,
        status: "RELEASED",
        products: [
          expect.objectContaining({
            id: reservationProducts[0].id,
            reservationId: reservation.id,
            productId: products[0].id,
            quantity: 2,
          }),
          expect.objectContaining({
            id: reservationProducts[1].id,
            reservationId: reservation.id,
            productId: products[1].id,
            quantity: 3,
          }),
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });

      const firstStockResponse = await api.stock.findOne({
        productId: products[0].id,
      });
      const secondStockResponse = await api.stock.findOne({
        productId: products[1].id,
      });

      expect(firstStockResponse.status).toEqual(200);
      expect(secondStockResponse.status).toEqual(200);

      if (!firstStockResponse.body.success || !secondStockResponse.body.success) {
        throw new Error("Expected stock lookup to succeed.");
      }

      expect(firstStockResponse.body.data.availableQuantity).toEqual(10);
      expect(firstStockResponse.body.data.reservedQuantity).toEqual(1);
      expect(secondStockResponse.body.data.availableQuantity).toEqual(5);
      expect(secondStockResponse.body.data.reservedQuantity).toEqual(0);
    });

    it("should be idempotent if reservation is already released", async () => {
      const product = fixtures.products.createOne();
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
          availableQuantity: 10,
          reservedQuantity: 0,
        },
      });
      const reservation = fixtures.reservations.createOne({
        reservation: {
          status: "RELEASED",
        },
      });
      const reservationProduct = fixtures.reservations.createItem({
        reservationProduct: {
          reservationId: reservation.id,
          productId: product.id,
          quantity: 2,
        },
      });

      await insert({
        products: [product],
        stock: [stock],
        reservations: [reservation],
        reservation_products: [reservationProduct],
      });

      const releaseOneResponse = await api.reservations.releaseOne({
        reservationId: reservation.id,
      });

      expect(releaseOneResponse.status).toEqual(200);
      expect(releaseOneResponse.body.success).toEqual(true);

      if (!releaseOneResponse.body.success) {
        throw new Error("Expected reservation release to succeed.");
      }

      expect(releaseOneResponse.body.data.status).toEqual("RELEASED");

      const stockResponse = await api.stock.findOne({
        productId: product.id,
      });

      expect(stockResponse.status).toEqual(200);
      expect(stockResponse.body.success).toEqual(true);

      if (!stockResponse.body.success) {
        throw new Error("Expected stock lookup to succeed.");
      }

      expect(stockResponse.body.data.availableQuantity).toEqual(10);
      expect(stockResponse.body.data.reservedQuantity).toEqual(0);
    });
  });

  describe("Error", () => {
    it("should return invalid_request if reservation id is invalid", async () => {
      const releaseOneResponse = await api.reservations.releaseOne({
        reservationId: "not-a-reservation-id",
      });

      expect(releaseOneResponse.status).toEqual(400);
      expect(releaseOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return reservation_not_found if reservation does not exist", async () => {
      const releaseOneResponse = await api.reservations.releaseOne({
        reservationId: randomUUID(),
      });

      expect(releaseOneResponse.status).toEqual(404);
      expect(releaseOneResponse.body).toEqual({
        success: false,
        error: "reservation_not_found",
      });
    });

    it("should return invalid_reservation_status if reservation is confirmed", async () => {
      const reservation = fixtures.reservations.createOne({
        reservation: {
          status: "CONFIRMED",
        },
      });

      await insert({
        reservations: [reservation],
      });

      const releaseOneResponse = await api.reservations.releaseOne({
        reservationId: reservation.id,
      });

      expect(releaseOneResponse.status).toEqual(409);
      expect(releaseOneResponse.body).toEqual({
        success: false,
        error: "invalid_reservation_status",
      });
    });
  });
});

import { randomUUID } from "node:crypto";

import { ISO_DATE_REGEX } from "../../../../src/constants/index.js";
import { getDatabase } from "../../../../src/infrastructure/adapters/database/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { insert, setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";
import * as fixtures from "../../../fixtures/index.js";

describe("POST /reservations", () => {
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
    it("should successfully create a reservation and reserve stock", async () => {
      const orderId = randomUUID();
      const products = fixtures.products.createMany({
        products: [{}, {}],
      });
      const stock = [
        fixtures.stock.createOne({
          stock: {
            productId: products[0].id,
            availableQuantity: 10,
            reservedQuantity: 1,
          },
        }),
        fixtures.stock.createOne({
          stock: {
            productId: products[1].id,
            availableQuantity: 5,
            reservedQuantity: 0,
          },
        }),
      ];

      await insert({
        products,
        stock,
      });

      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId,
          products: [
            {
              productId: products[0].id,
              quantity: 2,
            },
            {
              productId: products[1].id,
              quantity: 3,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(201);
      expect(createOneResponse.body.success).toEqual(true);

      if (!createOneResponse.body.success) {
        throw new Error("Expected reservation creation to succeed.");
      }

      expect(createOneResponse.body.data).toEqual({
        id: expect.any(String),
        orderId,
        status: "PENDING",
        products: [
          {
            id: expect.any(String),
            reservationId: createOneResponse.body.data.id,
            productId: products[0].id,
            quantity: 2,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
          {
            id: expect.any(String),
            reservationId: createOneResponse.body.data.id,
            productId: products[1].id,
            quantity: 3,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
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

      expect(firstStockResponse.body.data.availableQuantity).toEqual(8);
      expect(firstStockResponse.body.data.reservedQuantity).toEqual(3);
      expect(secondStockResponse.body.data.availableQuantity).toEqual(2);
      expect(secondStockResponse.body.data.reservedQuantity).toEqual(3);
    });

    it("should aggregate duplicated products in one reservation", async () => {
      const orderId = randomUUID();
      const product = fixtures.products.createOne();
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
          availableQuantity: 10,
          reservedQuantity: 0,
        },
      });

      await insert({
        products: [product],
        stock: [stock],
      });

      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId,
          products: [
            {
              productId: product.id,
              quantity: 2,
            },
            {
              productId: product.id,
              quantity: 3,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(201);
      expect(createOneResponse.body.success).toEqual(true);

      if (!createOneResponse.body.success) {
        throw new Error("Expected reservation creation to succeed.");
      }

      expect(createOneResponse.body.data.products).toEqual([
        expect.objectContaining({
          productId: product.id,
          quantity: 5,
        }),
      ]);

      const stockResponse = await api.stock.findOne({
        productId: product.id,
      });

      expect(stockResponse.status).toEqual(200);
      expect(stockResponse.body.success).toEqual(true);

      if (!stockResponse.body.success) {
        throw new Error("Expected stock lookup to succeed.");
      }

      expect(stockResponse.body.data.availableQuantity).toEqual(5);
      expect(stockResponse.body.data.reservedQuantity).toEqual(5);
    });

    it("should return the existing reservation when order already has one", async () => {
      const orderId = randomUUID();
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
          orderId,
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

      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId,
          products: [
            {
              productId: product.id,
              quantity: 2,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(201);
      expect(createOneResponse.body.success).toEqual(true);

      if (!createOneResponse.body.success) {
        throw new Error("Expected reservation creation to succeed.");
      }

      expect(createOneResponse.body.data.id).toEqual(reservation.id);
      expect(createOneResponse.body.data.products).toEqual([
        expect.objectContaining({
          id: reservationProduct.id,
          productId: product.id,
          quantity: 2,
        }),
      ]);

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
    it("should return invalid_request if reservation payload is invalid", async () => {
      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId: randomUUID(),
          products: [],
        },
      });

      expect(createOneResponse.status).toEqual(400);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return stock_not_found if a stock row does not exist", async () => {
      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId: randomUUID(),
          products: [
            {
              productId: randomUUID(),
              quantity: 1,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(404);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "stock_not_found",
      });
    });

    it("should return insufficient_stock if stock quantity is not enough", async () => {
      const product = fixtures.products.createOne();
      const stock = fixtures.stock.createOne({
        stock: {
          productId: product.id,
          availableQuantity: 1,
          reservedQuantity: 0,
        },
      });

      await insert({
        products: [product],
        stock: [stock],
      });

      const createOneResponse = await api.reservations.createOne({
        body: {
          orderId: randomUUID(),
          products: [
            {
              productId: product.id,
              quantity: 2,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(409);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "insufficient_stock",
      });

      const db = getDatabase();
      const stockRows = await db("stock").select("*");

      expect(stockRows).toHaveLength(1);
      expect(stockRows[0]).toMatchObject({
        product_id: product.id,
        available_quantity: 1,
        reserved_quantity: 0,
      });
    });
  });
});

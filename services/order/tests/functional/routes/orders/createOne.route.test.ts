import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { ISO_DATE_REGEX, UUID_REGEX } from "../../../../src/constants/index.js";
import { startTestApp, type TestApp } from "../../../utils/app.js";
import { setupTestDatabaseHooks } from "../../../utils/database.js";

import * as api from "../../../apis/index.js";

type Product = {
  id: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
};

type InventoryFailureMode =
  | "server_error"
  | "invalid_json";

type InventoryMockState = {
  failureMode?: InventoryFailureMode;
  productsById: Map<string, Product>;
};

describe("POST /api/v1/order/orders", () => {
  setupTestDatabaseHooks();

  let app: TestApp;
  let inventoryServer: Server;
  let inventoryState: InventoryMockState;

  beforeAll(async () => {
    inventoryState = {
      productsById: new Map(),
    };
    inventoryServer = await startInventoryMock({ state: inventoryState });

    const address = inventoryServer.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected inventory mock to listen on a TCP port.");
    }

    process.env.INVENTORY_SERVICE_BASE_URL = `http://127.0.0.1:${
      (address as AddressInfo).port
    }`;

    app = await startTestApp();
    api.client.configure({ baseUrl: app.baseUrl });
  });

  afterAll(async () => {
    await app?.close();
    await closeServer({ server: inventoryServer });
  });

  beforeEach(() => {
    inventoryState.productsById.clear();
    inventoryState.failureMode = undefined;
  });

  describe("Success", () => {
    it("should create a pending order with product snapshots", async () => {
      const product = {
        id: randomUUID(),
        sku: "SKU-001",
        name: "Test product",
        price: 12.34,
        currency: "EUR",
      };

      inventoryState.productsById.set(product.id, product);

      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [
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
        throw new Error("Expected order creation to succeed.");
      }

      expect(createOneResponse.body.data).toEqual({
        id: expect.stringMatching(UUID_REGEX),
        customerId: "customer-001",
        status: "PENDING",
        totalAmount: 24.68,
        currency: "EUR",
        items: [
          {
            id: expect.stringMatching(UUID_REGEX),
            orderId: createOneResponse.body.data.id,
            productId: product.id,
            quantity: 2,
            unitPriceSnapshot: 12.34,
            lineTotalSnapshot: 24.68,
            skuSnapshot: product.sku,
            nameSnapshot: product.name,
            createdAt: expect.stringMatching(ISO_DATE_REGEX),
            updatedAt: expect.stringMatching(ISO_DATE_REGEX),
          },
        ],
        createdAt: expect.stringMatching(ISO_DATE_REGEX),
        updatedAt: expect.stringMatching(ISO_DATE_REGEX),
      });
    });

    it("should aggregate duplicate product lines", async () => {
      const product = {
        id: randomUUID(),
        sku: "SKU-001",
        name: "Test product",
        price: 10,
        currency: "EUR",
      };

      inventoryState.productsById.set(product.id, product);

      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [
            {
              productId: product.id,
              quantity: 1,
            },
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
        throw new Error("Expected order creation to succeed.");
      }

      expect(createOneResponse.body.data.items).toHaveLength(1);
      expect(createOneResponse.body.data.items[0]).toEqual(
        expect.objectContaining({
          productId: product.id,
          quantity: 3,
          unitPriceSnapshot: 10,
          lineTotalSnapshot: 30,
        }),
      );
    });
  });

  describe("Error", () => {
    it("should return invalid_request if body is invalid", async () => {
      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [],
        },
      });

      expect(createOneResponse.status).toEqual(400);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "invalid_request",
      });
    });

    it("should return product_not_found if a product does not exist", async () => {
      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [
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
        error: "product_not_found",
      });
    });

    it("should return inventory_service_unavailable if inventory returns an error", async () => {
      inventoryState.failureMode = "server_error";

      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [
            {
              productId: randomUUID(),
              quantity: 1,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(502);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "inventory_service_unavailable",
      });
    });

    it("should return inventory_service_unavailable if inventory returns invalid JSON", async () => {
      inventoryState.failureMode = "invalid_json";

      const createOneResponse = await api.orders.createOne({
        body: {
          customerId: "customer-001",
          items: [
            {
              productId: randomUUID(),
              quantity: 1,
            },
          ],
        },
      });

      expect(createOneResponse.status).toEqual(502);
      expect(createOneResponse.body).toEqual({
        success: false,
        error: "inventory_service_unavailable",
      });
    });

  });
});

async function startInventoryMock({
  state,
}: {
  state: InventoryMockState;
}): Promise<Server> {
  const server = createServer((request, response) => {
    if (state.failureMode === "server_error") {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          success: false,
          error: "internal_error",
        }),
      );
      return;
    }

    if (state.failureMode === "invalid_json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{");
      return;
    }

    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const productId = requestUrl.pathname.replace(
      "/api/v1/inventory/products/",
      "",
    );
    const product = state.productsById.get(productId);

    if (!product) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          success: false,
          error: "product_not_found",
        }),
      );
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        success: true,
        data: {
          ...product,
          description: null,
          createdAt: "2026-05-05T10:00:00.000Z",
          updatedAt: "2026-05-05T10:00:00.000Z",
        },
      }),
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });

  return server;
}

async function closeServer({ server }: { server: Server }) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

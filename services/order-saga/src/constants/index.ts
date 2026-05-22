import { config } from "../config.js";

export const SERVICE_NAME = "order-saga";

export const ORDER_SERVICE_NAME = "order";
export const ORDER_SERVICE_API_PREFIX = "/api/v1/order";
export const ORDER_SERVICE_BASE_URL = {
  get value(): string {
    return process.env.ORDER_SERVICE_BASE_URL ?? config.ORDER_SERVICE_BASE_URL;
  },
};

export const INVENTORY_SERVICE_NAME = "inventory";
export const INVENTORY_SERVICE_API_PREFIX = "/api/v1/inventory";
export const INVENTORY_SERVICE_BASE_URL = {
  get value(): string {
    return (
      process.env.INVENTORY_SERVICE_BASE_URL ??
      config.INVENTORY_SERVICE_BASE_URL
    );
  },
};

export const PAYMENTS_SERVICE_NAME = "payments";
export const PAYMENTS_SERVICE_API_PREFIX = "/api/v1/payments";
export const PAYMENTS_SERVICE_BASE_URL = {
  get value(): string {
    return (
      process.env.PAYMENTS_SERVICE_BASE_URL ?? config.PAYMENTS_SERVICE_BASE_URL
    );
  },
};

export const CORRELATION_ID_HEADER = "x-correlation-id";
export const CAUSATION_ID_HEADER = "x-causation-id";

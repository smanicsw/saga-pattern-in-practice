import { config } from "../config.js";

export const SERVICE_NAME = "order";

export const SERVICE_API_PREFIX = "/api/v1/order";

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

export const DEFAULT_ORDERS_LIMIT = 20;

export const MAX_ORDERS_LIMIT = 100;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

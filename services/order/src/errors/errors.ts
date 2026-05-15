import { HttpError } from "@saga/http-kit";

export class OrderNotFoundError extends HttpError {
  constructor() {
    super({
      status: 404,
      code: "order_not_found",
      message: "Order not found.",
    });
  }
}

export class ProductNotFoundError extends HttpError {
  constructor() {
    super({
      status: 404,
      code: "product_not_found",
      message: "Product not found.",
    });
  }
}

export class InventoryServiceUnavailableError extends HttpError {
  constructor() {
    super({
      status: 502,
      code: "inventory_service_unavailable",
      message: "Inventory service is unavailable.",
    });
  }
}

export class OrderCurrencyMismatchError extends HttpError {
  constructor() {
    super({
      status: 409,
      code: "order_currency_mismatch",
      message: "Order items must use the same currency.",
    });
  }
}

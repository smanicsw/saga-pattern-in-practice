import { HttpError } from "@saga/http-kit";

export class ProductNotFoundError extends HttpError {
  constructor() {
    super({
      status: 404,
      code: "product_not_found",
      message: "Product not found.",
    });
  }
}

export class StockNotFoundError extends HttpError {
  constructor() {
    super({
      status: 404,
      code: "stock_not_found",
      message: "Stock not found.",
    });
  }
}

export class InsufficientStockError extends HttpError {
  constructor() {
    super({
      status: 409,
      code: "insufficient_stock",
      message: "Insufficient stock.",
    });
  }
}

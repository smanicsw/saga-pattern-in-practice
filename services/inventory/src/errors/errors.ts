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

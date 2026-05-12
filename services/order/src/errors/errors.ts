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

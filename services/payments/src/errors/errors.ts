import { HttpError } from "@saga/http-kit";

export class PaymentNotFoundError extends HttpError {
  constructor() {
    super({
      status: 404,
      code: "payment_not_found",
      message: "Payment not found.",
    });
  }
}

export class PaymentConflictError extends HttpError {
  constructor({
    message = "Payment request conflicts with an existing payment.",
  } = {}) {
    super({
      status: 409,
      code: "payment_conflict",
      message,
    });
  }
}

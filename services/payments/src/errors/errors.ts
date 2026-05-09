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

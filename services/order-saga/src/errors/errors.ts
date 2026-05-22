import { HttpError } from "@saga/http-kit";

export class OrderServiceUnavailableError extends HttpError {
  constructor() {
    super({
      status: 502,
      code: "order_service_unavailable",
      message: "Order service is unavailable.",
    });
  }
}

export class OrderRequestFailedError extends HttpError {
  constructor({
    upstreamError,
    upstreamStatus,
  }: {
    upstreamError: string;
    upstreamStatus: number;
  }) {
    super({
      status: 502,
      code: "order_request_failed",
      message: "Order service rejected the request.",
    });

    this.upstreamError = upstreamError;
    this.upstreamStatus = upstreamStatus;
  }

  readonly upstreamError: string;
  readonly upstreamStatus: number;
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

export class InventoryRequestFailedError extends HttpError {
  constructor({
    upstreamError,
    upstreamStatus,
  }: {
    upstreamError: string;
    upstreamStatus: number;
  }) {
    super({
      status: 502,
      code: "inventory_request_failed",
      message: "Inventory service rejected the request.",
    });

    this.upstreamError = upstreamError;
    this.upstreamStatus = upstreamStatus;
  }

  readonly upstreamError: string;
  readonly upstreamStatus: number;
}

export class PaymentsServiceUnavailableError extends HttpError {
  constructor() {
    super({
      status: 502,
      code: "payments_service_unavailable",
      message: "Payments service is unavailable.",
    });
  }
}

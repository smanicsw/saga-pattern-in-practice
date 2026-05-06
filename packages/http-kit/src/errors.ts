export type ErrorDetails = Array<{ path: string; message: string }>;

export class HttpError extends Error {
  constructor({
    status,
    code,
    message = code,
    details,
  }: {
    status: number;
    code: string;
    message?: string;
    details?: ErrorDetails;
  }) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }

  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetails;
}

export class BadRequestError extends HttpError {
  constructor({
    message = "Invalid request.",
    details,
  }: {
    message?: string;
    details?: ErrorDetails;
  } = {}) {
    super({
      status: 400,
      code: "invalid_request",
      message,
      details,
    });
  }
}

export class NotFoundError extends HttpError {
  constructor({ message = "Resource not found." }: { message?: string } = {}) {
    super({
      status: 404,
      code: "not_found",
      message,
    });
  }
}

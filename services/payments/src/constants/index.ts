export const SERVICE_NAME = "payments";

export const SERVICE_API_PREFIX = "/api/v1/payments";

export const DEFAULT_PAYMENTS_LIMIT = 20;

export const MAX_PAYMENTS_LIMIT = 100;

export const CORRELATION_ID_HEADER = "x-correlation-id";

export const CAUSATION_ID_HEADER = "x-causation-id";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

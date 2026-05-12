import type { IncomingHttpHeaders } from "node:http";

import { BadRequestError } from "@saga/http-kit";

import type { OutboxEventMetadata } from "./entities.js";

export const DEFAULT_CORRELATION_ID_HEADER = "x-correlation-id";
export const DEFAULT_CAUSATION_ID_HEADER = "x-causation-id";

export function getOutboxEventMetadata({
  headers,
  correlationIdHeader = DEFAULT_CORRELATION_ID_HEADER,
  causationIdHeader = DEFAULT_CAUSATION_ID_HEADER,
  uuidRegex,
}: {
  headers: IncomingHttpHeaders;
  correlationIdHeader?: string;
  causationIdHeader?: string;
  uuidRegex: RegExp;
}): OutboxEventMetadata {
  return {
    correlationId: getOptionalUuidHeader({
      headers,
      headerName: correlationIdHeader,
      uuidRegex,
    }),
    causationId: getOptionalUuidHeader({
      headers,
      headerName: causationIdHeader,
      uuidRegex,
    }),
  };
}

function getOptionalUuidHeader({
  headers,
  headerName,
  uuidRegex,
}: {
  headers: IncomingHttpHeaders;
  headerName: string;
  uuidRegex: RegExp;
}): string | null {
  const headerValue = headers[headerName];

  if (headerValue === undefined) {
    return null;
  }

  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!value) {
    return null;
  }

  if (!uuidRegex.test(value)) {
    throw new BadRequestError({
      details: [
        {
          path: `headers.${headerName}`,
          message: "Expected a valid UUID.",
        },
      ],
    });
  }

  return value;
}

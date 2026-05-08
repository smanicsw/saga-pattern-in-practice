import type { IncomingHttpHeaders } from "node:http";

import { BadRequestError } from "@saga/http-kit";

import {
  CAUSATION_ID_HEADER,
  CORRELATION_ID_HEADER,
  UUID_REGEX,
} from "../constants/index.js";
import type { OutboxEventMetadata } from "../entities/outbox-event.entity.js";

export default function getOutboxEventMetadata({
  headers,
}: {
  headers: IncomingHttpHeaders;
}): OutboxEventMetadata {
  return {
    correlationId: getOptionalUuidHeader({
      headers,
      headerName: CORRELATION_ID_HEADER,
    }),
    causationId: getOptionalUuidHeader({
      headers,
      headerName: CAUSATION_ID_HEADER,
    }),
  };
}

function getOptionalUuidHeader({
  headers,
  headerName,
}: {
  headers: IncomingHttpHeaders;
  headerName: string;
}): string | null {
  const headerValue = headers[headerName];

  if (headerValue === undefined) {
    return null;
  }

  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!value) {
    return null;
  }

  if (!UUID_REGEX.test(value)) {
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

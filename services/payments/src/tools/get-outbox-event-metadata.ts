import type { IncomingHttpHeaders } from "node:http";

import { getOutboxEventMetadata as getSharedOutboxEventMetadata } from "@saga/outbox-kit";

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
  return getSharedOutboxEventMetadata({
    headers,
    correlationIdHeader: CORRELATION_ID_HEADER,
    causationIdHeader: CAUSATION_ID_HEADER,
    uuidRegex: UUID_REGEX,
  });
}

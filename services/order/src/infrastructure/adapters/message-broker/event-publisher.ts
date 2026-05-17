import {
  createLoggingEventPublisher,
  type PublishEventInput,
} from "@saga/outbox-kit";

import { logger } from "../logger/index.js";

export type { PublishEventInput };

export const { publish } = createLoggingEventPublisher({ logger });

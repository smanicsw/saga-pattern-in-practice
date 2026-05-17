import {
  createKafkaEventPublisher,
  type PublishEventInput,
} from "@saga/outbox-kit";

import { config } from "../../../config.js";
import { SERVICE_NAME } from "../../../constants/index.js";
import { logger } from "../logger/index.js";

export type { PublishEventInput };

export const { disconnect, publish } = createKafkaEventPublisher({
  brokers: config.KAFKA_BROKERS,
  clientId: `${SERVICE_NAME}-outbox-worker`,
  logger,
});

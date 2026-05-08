import type { OutboxEvent } from "../../../entities/outbox-event.entity.js";
import { logger } from "../logger/index.js";

export type PublishEventInput<TPayload = unknown> = {
  topic: string;
  key: string;
  event: OutboxEvent<TPayload>;
};

export async function publish<TPayload>({
  topic,
  key,
  event,
}: PublishEventInput<TPayload>): Promise<void> {
  logger.info(
    {
      topic,
      key,
      eventId: event.id,
      eventType: event.type,
      aggregateType: event.aggregate.type,
      aggregateId: event.aggregate.id,
    },
    "message broker stub published event",
  );
}

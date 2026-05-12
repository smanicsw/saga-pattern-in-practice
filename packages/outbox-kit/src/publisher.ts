import type { OutboxEvent } from "./entities.js";

export type EventPublisherLogger = {
  info: (object: unknown, message?: string) => void;
};

export type PublishEventInput<
  TPayload = unknown,
  TService extends string = string,
> = {
  topic: string;
  key: string;
  event: OutboxEvent<TPayload, TService>;
};

export function createLoggingEventPublisher({
  logger,
}: {
  logger: EventPublisherLogger;
}) {
  async function publish<TPayload = unknown, TService extends string = string>({
    topic,
    key,
    event,
  }: PublishEventInput<TPayload, TService>): Promise<void> {
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

  return {
    publish,
  };
}

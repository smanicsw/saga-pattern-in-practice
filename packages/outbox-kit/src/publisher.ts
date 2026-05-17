import type { OutboxEvent } from "./entities.js";
import { Kafka, logLevel, type Producer } from "kafkajs";

export type EventPublisherLogger = {
  info: (object: unknown, message?: string) => void;
  error?: (object: unknown, message?: string) => void;
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

export function createKafkaEventPublisher({
  brokers,
  clientId,
  logger,
}: {
  brokers: string | string[];
  clientId: string;
  logger: EventPublisherLogger;
}) {
  const kafkaBrokers = normalizeKafkaBrokers({ brokers });

  const kafka = new Kafka({
    brokers: kafkaBrokers,
    clientId,
    logLevel: logLevel.NOTHING,
  });

  const producer = kafka.producer();
  let connectedProducer: Promise<Producer> | null = null;

  async function getProducer(): Promise<Producer> {
    if (!connectedProducer) {
      connectedProducer = producer
        .connect()
        .then(() => {
          logger.info(
            {
              brokers: kafkaBrokers,
              clientId,
            },
            "kafka producer connected",
          );

          return producer;
        })
        .catch((error) => {
          connectedProducer = null;
          throw error;
        });
    }

    return connectedProducer;
  }

  async function publish<TPayload = unknown, TService extends string = string>({
    topic,
    key,
    event,
  }: PublishEventInput<TPayload, TService>): Promise<void> {
    const activeProducer = await getProducer();

    await activeProducer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(event),
          timestamp: String(new Date(event.occurredAt).getTime()),
          headers: buildHeaders({ event }),
        },
      ],
    });

    logger.info(
      {
        topic,
        key,
        eventId: event.id,
        eventType: event.type,
        aggregateType: event.aggregate.type,
        aggregateId: event.aggregate.id,
      },
      "kafka event published",
    );
  }

  async function disconnect(): Promise<void> {
    if (!connectedProducer) {
      return;
    }

    try {
      await producer.disconnect();
      connectedProducer = null;
    } catch (error) {
      logger.error?.({ error }, "failed to disconnect kafka producer");
      throw error;
    }
  }

  return {
    disconnect,
    publish,
  };
}

function normalizeKafkaBrokers({
  brokers,
}: {
  brokers: string | string[];
}): string[] {
  const parsedBrokers = Array.isArray(brokers)
    ? brokers
    : brokers.split(",");

  return parsedBrokers.map((broker) => broker.trim()).filter(Boolean);
}

function buildHeaders<TPayload, TService extends string>({
  event,
}: {
  event: OutboxEvent<TPayload, TService>;
}): Record<string, string> {
  return removeEmptyHeaders({
    eventId: event.id,
    eventType: event.type,
    eventVersion: String(event.version),
    service: event.service,
    aggregateType: event.aggregate.type,
    aggregateId: event.aggregate.id,
    correlationId: event.correlationId,
    causationId: event.causationId,
    occurredAt: event.occurredAt,
  });
}

function removeEmptyHeaders(
  headers: Record<string, string | null>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      (entry): entry is [string, string] => entry[1] !== null,
    ),
  );
}

import type { OutboxEvent } from "./entities.js";
import { normalizeKafkaBrokers } from "./kafka.js";
import {
  Kafka,
  logLevel,
  type Admin,
  type Consumer,
  type KafkaMessage,
} from "kafkajs";

export type EventConsumerLogger = {
  info: (object: unknown, message?: string) => void;
  error: (object: unknown, message?: string) => void;
};

export type ConsumedKafkaEventContext = {
  topic: string;
  partition: number;
  messageOffset: string;
  timestamp: string | null;
  key: string | null;
  headers: Record<string, string>;
};

export type KafkaEventHandler<
  TPayload = unknown,
  TService extends string = string,
> = (input: {
  event: OutboxEvent<TPayload, TService>;
  context: ConsumedKafkaEventContext;
}) => Promise<void>;

export type KafkaEventHandlerByType = Record<string, KafkaEventHandler>;

export function createKafkaEventConsumer({
  brokers,
  clientId,
  groupId,
  topics,
  handlers,
  logger,
  fromBeginning = false,
}: {
  brokers: string | string[];
  clientId: string;
  groupId: string;
  topics: string[];
  handlers: KafkaEventHandlerByType;
  logger: EventConsumerLogger;
  fromBeginning?: boolean;
}) {
  const kafkaBrokers = normalizeKafkaBrokers({ brokers });
  const kafka = new Kafka({
    brokers: kafkaBrokers,
    clientId,
    logLevel: logLevel.NOTHING,
  });

  const admin = kafka.admin();
  const consumer = kafka.consumer({ groupId });
  let startedConsumer: Promise<Consumer> | null = null;

  async function start(): Promise<void> {
    if (startedConsumer) {
      await startedConsumer;
      return;
    }

    startedConsumer = connectAndRun();
    await startedConsumer;
  }

  async function stop(): Promise<void> {
    if (!startedConsumer) {
      return;
    }

    try {
      const activeConsumer = await startedConsumer;
      await activeConsumer.disconnect();
      startedConsumer = null;
    } catch (error) {
      logger.error({ error }, "failed to disconnect kafka consumer");
      throw error;
    }
  }

  async function connectAndRun(): Promise<Consumer> {
    await ensureTopicsExist();
    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({
        topic,
        fromBeginning,
      });
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const parsedMessage = parseKafkaOutboxEventMessage({
          message,
          partition,
          topic,
        });

        const handler = handlers[parsedMessage.event.type];

        if (!handler) {
          logger.info(
            {
              eventId: parsedMessage.event.id,
              eventType: parsedMessage.event.type,
              topic,
              partition,
              messageOffset: parsedMessage.context.messageOffset,
            },
            "kafka event skipped because no handler is registered",
          );

          return;
        }

        try {
          await handler(parsedMessage);
        } catch (error) {
          logger.error(
            {
              error,
              eventId: parsedMessage.event.id,
              eventType: parsedMessage.event.type,
              topic,
              partition,
              messageOffset: parsedMessage.context.messageOffset,
            },
            "kafka event handler failed",
          );

          throw error;
        }
      },
    });

    logger.info(
      {
        brokers: kafkaBrokers,
        clientId,
        groupId,
        topics,
      },
      "kafka event consumer started",
    );

    return consumer;
  }

  async function ensureTopicsExist(): Promise<void> {
    await admin.connect();

    try {
      await admin.createTopics({
        waitForLeaders: true,
        topics: topics.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      });

      logger.info(
        {
          topics,
        },
        "kafka consumer topics are ready",
      );
    } finally {
      await disconnectAdmin({ admin });
    }
  }

  return {
    start,
    stop,
  };
}

async function disconnectAdmin({ admin }: { admin: Admin }): Promise<void> {
  await admin.disconnect();
}

export function parseKafkaOutboxEventMessage({
  message,
  partition,
  topic,
}: {
  message: Pick<
    KafkaMessage,
    "headers" | "key" | "offset" | "timestamp" | "value"
  >;
  partition: number;
  topic: string;
}): {
  event: OutboxEvent;
  context: ConsumedKafkaEventContext;
} {
  if (!message.value) {
    throw new Error("Kafka message value is empty.");
  }

  const event = parseOutboxEvent({
    value: message.value.toString("utf8"),
  });

  return {
    event,
    context: {
      topic,
      partition,
      messageOffset: message.offset,
      timestamp: message.timestamp ?? null,
      key: message.key?.toString("utf8") ?? null,
      headers: normalizeKafkaHeaders({
        headers: message.headers ?? {},
      }),
    },
  };
}

function parseOutboxEvent({ value }: { value: string }): OutboxEvent {
  const parsedValue = JSON.parse(value) as unknown;

  if (!isOutboxEvent(parsedValue)) {
    throw new Error("Kafka message value is not a valid outbox event.");
  }

  return parsedValue;
}

function isOutboxEvent(value: unknown): value is OutboxEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "type" in value &&
    "version" in value &&
    "service" in value &&
    "aggregate" in value &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { type?: unknown }).type === "string" &&
    typeof (value as { version?: unknown }).version === "number" &&
    typeof (value as { service?: unknown }).service === "string" &&
    typeof (value as { aggregate?: unknown }).aggregate === "object" &&
    (value as { aggregate?: unknown }).aggregate !== null &&
    typeof (value as { aggregate: { type?: unknown } }).aggregate.type ===
      "string" &&
    typeof (value as { aggregate: { id?: unknown } }).aggregate.id === "string"
  );
}

function normalizeKafkaHeaders({
  headers,
}: {
  headers: NonNullable<KafkaMessage["headers"]>;
}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).flatMap(([key, value]) => {
      const normalizedValue = normalizeKafkaHeaderValue({ value });

      if (normalizedValue === null) {
        return [];
      }

      return [[key, normalizedValue]];
    }),
  );
}

function normalizeKafkaHeaderValue({
  value,
}: {
  value: NonNullable<KafkaMessage["headers"]>[string];
}): string | null {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeSingleKafkaHeaderValue({ value: item }))
      .filter((item): item is string => item !== null)
      .join(",");
  }

  return normalizeSingleKafkaHeaderValue({ value });
}

function normalizeSingleKafkaHeaderValue({
  value,
}: {
  value: Buffer | string | undefined;
}): string | null {
  if (value === undefined) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  return value;
}

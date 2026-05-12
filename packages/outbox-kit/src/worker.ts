import type { MarkOutboxEventAsFailed, OutboxEvent } from "./entities.js";
import type { OutboxEventRepository } from "./repository.js";

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60_000;
const MAX_PUBLISH_ATTEMPTS = 10;

export type OutboxLogger = {
  info: (object: unknown, message?: string) => void;
  error: (object: unknown, message?: string) => void;
};

export type OutboxPublisher<TService extends string> = {
  publish: (input: {
    topic: string;
    key: string;
    event: OutboxEvent<unknown, TService>;
  }) => Promise<void>;
};

export function createOutboxWorker<TService extends string>({
  serviceName,
  topic,
  connectDatabase,
  disconnectDatabase,
  withTransaction,
  repository,
  publisher,
  logger,
}: {
  serviceName: TService;
  topic: string;
  connectDatabase: () => Promise<void>;
  disconnectDatabase: () => Promise<void>;
  withTransaction: <T>(input: { operation: () => Promise<T> }) => Promise<T>;
  repository: Pick<
    OutboxEventRepository<TService>,
    "findManyPendingForPublishing" | "markOneAsPublished" | "markOneAsFailed"
  >;
  publisher: OutboxPublisher<TService>;
  logger: OutboxLogger;
}) {
  let shouldStop = false;

  async function processPendingOutboxEvents({
    limit = DEFAULT_BATCH_SIZE,
    now = new Date().toISOString(),
  }: {
    limit?: number;
    now?: string;
  } = {}): Promise<number> {
    return withTransaction({
      operation: async () => {
        const outboxEvents = await repository.findManyPendingForPublishing({
          limit,
          now,
        });

        for (const outboxEvent of outboxEvents) {
          try {
            await publisher.publish({
              topic,
              key: outboxEvent.aggregate.id,
              event: outboxEvent,
            });

            const publishedAt = new Date().toISOString();

            await repository.markOneAsPublished({
              outboxEventId: outboxEvent.id,
              markOutboxEventAsPublished: {
                status: "PUBLISHED",
                publishedAt,
                updatedAt: publishedAt,
              },
            });
          } catch (error) {
            const failedAt = new Date().toISOString();

            const failedPublishUpdate = buildFailedPublishUpdate({
              currentAttempts: outboxEvent.attempts,
              failedAt,
              lastError: getErrorMessage({ error }),
            });

            await repository.markOneAsFailed({
              outboxEventId: outboxEvent.id,
              markOutboxEventAsFailed: failedPublishUpdate,
            });

            if (failedPublishUpdate.status === "DEAD_LETTERED") {
              logger.error(
                {
                  outboxEventId: outboxEvent.id,
                  attempts: failedPublishUpdate.attempts,
                },
                "outbox event dead-lettered after max publish attempts",
              );
            }
          }
        }

        return outboxEvents.length;
      },
    });
  }

  async function startOutboxWorker({
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    batchSize = DEFAULT_BATCH_SIZE,
  }: {
    pollIntervalMs?: number;
    batchSize?: number;
  } = {}): Promise<void> {
    await connectDatabase();

    logger.info(
      {
        batchSize,
        pollIntervalMs,
      },
      `${serviceName} outbox worker started`,
    );

    while (!shouldStop) {
      try {
        const processedEventsCount = await processPendingOutboxEvents({
          limit: batchSize,
        });

        if (processedEventsCount === 0) {
          await sleep({ ms: pollIntervalMs });
        }
      } catch (error) {
        logger.error({ error }, `${serviceName} outbox worker batch failed`);
        await sleep({ ms: pollIntervalMs });
      }
    }

    await disconnectDatabase();
  }

  function stopOutboxWorker() {
    shouldStop = true;
  }

  return {
    processPendingOutboxEvents,
    startOutboxWorker,
    stopOutboxWorker,
  };
}

export function buildFailedPublishUpdate({
  currentAttempts,
  failedAt,
  lastError,
}: {
  currentAttempts: number;
  failedAt: string;
  lastError: string;
}): MarkOutboxEventAsFailed {
  const attempts = currentAttempts + 1;
  const shouldDeadLetter = attempts >= MAX_PUBLISH_ATTEMPTS;

  return {
    status: shouldDeadLetter ? "DEAD_LETTERED" : "PENDING",
    attempts,
    nextAttemptAt: shouldDeadLetter
      ? null
      : calculateNextAttemptAt({
          attempts,
          failedAt,
        }),
    deadLetteredAt: shouldDeadLetter ? failedAt : null,
    lastError,
    updatedAt: failedAt,
  };
}

export function calculateNextAttemptAt({
  attempts,
  failedAt,
}: {
  attempts: number;
  failedAt: string;
}): string {
  const retryDelayMs = Math.min(2 ** attempts * 1_000, MAX_RETRY_DELAY_MS);

  return new Date(new Date(failedAt).getTime() + retryDelayMs).toISOString();
}

function getErrorMessage({ error }: { error: unknown }): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown publish error.";
}

function sleep({ ms }: { ms: number }): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

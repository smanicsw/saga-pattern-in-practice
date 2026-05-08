import {
  connectDatabase,
  disconnectDatabase,
  withTransaction,
} from "../infrastructure/adapters/database/index.js";
import { logger } from "../infrastructure/adapters/logger/index.js";
import * as eventPublisher from "../infrastructure/adapters/message-broker/event-publisher.js";
import * as outboxEventRepository from "../repositories/outbox-event.repository.js";

const OUTBOX_TOPIC = "outbox-events.inventory";
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const MAX_RETRY_DELAY_MS = 60_000;
const MAX_PUBLISH_ATTEMPTS = 10;

let shouldStop = false;

export async function processPendingOutboxEvents({
  limit = DEFAULT_BATCH_SIZE,
  now = new Date().toISOString(),
}: {
  limit?: number;
  now?: string;
} = {}): Promise<number> {
  return withTransaction({
    operation: async () => {
      const outboxEvents =
        await outboxEventRepository.findManyPendingForPublishing({
          limit,
          now,
        });

      for (const outboxEvent of outboxEvents) {
        try {
          await eventPublisher.publish({
            topic: OUTBOX_TOPIC,
            key: outboxEvent.aggregate.id,
            event: outboxEvent,
          });

          const publishedAt = new Date().toISOString();

          await outboxEventRepository.markOneAsPublished({
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

          await outboxEventRepository.markOneAsFailed({
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

export async function startOutboxWorker({
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
    "inventory outbox worker started",
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
      logger.error({ error }, "inventory outbox worker batch failed");
      await sleep({ ms: pollIntervalMs });
    }
  }

  await disconnectDatabase();
}

export function buildFailedPublishUpdate({
  currentAttempts,
  failedAt,
  lastError,
}: {
  currentAttempts: number;
  failedAt: string;
  lastError: string;
}) {
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
  } as const;
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

function registerShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      logger.info({ signal }, "stopping inventory outbox worker");
      shouldStop = true;
    });
  }
}

if (isDirectRun()) {
  registerShutdownHandlers();

  startOutboxWorker().catch((error) => {
    logger.error({ error }, "failed to start inventory outbox worker");
    process.exit(1);
  });
}

function isDirectRun(): boolean {
  const executedFilePath = process.argv[1];

  return (
    executedFilePath?.endsWith("src/outbox/worker.ts") === true ||
    executedFilePath?.endsWith("dist/outbox/worker.js") === true
  );
}

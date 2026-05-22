import {
  calculateNextAttemptAt,
  type ConsumedKafkaEventContext,
  type KafkaEventHandler,
  type OutboxEvent,
} from "@saga/outbox-kit";

import type {
  InboxEvent,
  InboxEventSourceService,
  NewInboxEvent,
} from "../entities/index.js";
import { withTransaction } from "../infrastructure/adapters/database/index.js";
import { logger } from "../infrastructure/adapters/logger/index.js";
import * as inboxEventRepository from "../repositories/inbox-event.repository.js";
import { getErrorMessage } from "../orchestrator/orchestration-error.js";

export function buildInboxBackedHandlers({
  handlers,
}: {
  handlers: Record<string, KafkaEventHandler>;
}): Record<string, KafkaEventHandler> {
  return Object.fromEntries(
    Object.entries(handlers).map(([eventType, handler]) => [
      eventType,
      (input) => handleConsumedEvent({ ...input, handler }),
    ]),
  );
}

export async function handleConsumedEvent<TPayload = unknown>({
  context,
  event,
  handler,
}: {
  context: ConsumedKafkaEventContext;
  event: OutboxEvent<TPayload>;
  handler: KafkaEventHandler<TPayload>;
}): Promise<void> {
  const inboxEvent = await markInboxEventAsProcessing({
    context,
    event,
  });

  if (inboxEvent.status === "PROCESSED") {
    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      "kafka event skipped because it was already processed",
    );

    return;
  }

  try {
    await handler({ context, event });
    await markInboxEventAsProcessed({ event });
  } catch (error) {
    await markInboxEventAsFailed({
      error,
      event,
      attempts: inboxEvent.attempts,
    });

    throw error;
  }
}

async function markInboxEventAsProcessing<TPayload>({
  context,
  event,
}: {
  context: ConsumedKafkaEventContext;
  event: OutboxEvent<TPayload>;
}): Promise<InboxEvent<TPayload>> {
  return withTransaction({
    operation: async () => {
      const date = new Date().toISOString();

      const { inboxEvent } =
        await inboxEventRepository.createOneOrFindExisting<TPayload>({
          inboxEvent: buildNewInboxEvent({
            context,
            date,
            event,
          }),
        });

      if (inboxEvent.status === "PROCESSED") {
        return inboxEvent;
      }

      const processingInboxEvent =
        await inboxEventRepository.markOneAsProcessing({
          eventId: event.id,
          markInboxEventAsProcessing: {
            status: "PROCESSING",
            attempts: inboxEvent.attempts + 1,
            updatedAt: date,
          },
        });

      if (!processingInboxEvent) {
        throw new Error("Inbox event was not found while marking processing.");
      }

      return processingInboxEvent as InboxEvent<TPayload>;
    },
  });
}

async function markInboxEventAsProcessed({
  event,
}: {
  event: OutboxEvent;
}): Promise<void> {
  const date = new Date().toISOString();

  const inboxEvent = await inboxEventRepository.markOneAsProcessed({
    eventId: event.id,
    markInboxEventAsProcessed: {
      status: "PROCESSED",
      processedAt: date,
      updatedAt: date,
    },
  });

  if (!inboxEvent) {
    throw new Error("Inbox event was not found while marking processed.");
  }
}

async function markInboxEventAsFailed({
  attempts,
  error,
  event,
}: {
  attempts: number;
  error: unknown;
  event: OutboxEvent;
}): Promise<void> {
  const date = new Date().toISOString();

  const inboxEvent = await inboxEventRepository.markOneAsFailed({
    eventId: event.id,
    markInboxEventAsFailed: {
      status: "FAILED",
      attempts,
      nextAttemptAt: calculateNextAttemptAt({
        attempts,
        failedAt: date,
      }),
      deadLetteredAt: null,
      lastError: getErrorMessage({ error }),
      updatedAt: date,
    },
  });

  if (!inboxEvent) {
    throw new Error("Inbox event was not found while marking failed.");
  }
}

function buildNewInboxEvent<TPayload>({
  context,
  date,
  event,
}: {
  context: ConsumedKafkaEventContext;
  date: string;
  event: OutboxEvent<TPayload>;
}): NewInboxEvent<TPayload> {
  return {
    eventId: event.id,
    type: event.type,
    version: event.version,
    sourceService: toInboxEventSourceService({ service: event.service }),
    aggregate: event.aggregate,
    topic: context.topic,
    partition: context.partition,
    messageOffset: context.messageOffset,
    payload: event.payload,
    headers: context.headers,
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: date,
    receivedAt: date,
    processedAt: null,
    deadLetteredAt: null,
    lastError: null,
    createdAt: date,
    updatedAt: date,
  };
}

function toInboxEventSourceService({
  service,
}: {
  service: string;
}): InboxEventSourceService {
  if (
    service === "order" ||
    service === "inventory" ||
    service === "payments"
  ) {
    return service;
  }

  throw new Error(`Unsupported inbox event source service: ${service}`);
}

import type {
  OutboxEvent,
  OutboxEventAction,
  OutboxEventAggregate,
  OutboxEventMetadata,
} from "../entities/outbox-event.entity.js";
import * as outboxEventRepository from "../repositories/outbox-event.repository.js";

export type CreateOutboxEventInput<TPayload> = OutboxEventMetadata & {
  type: string;
  version: number;
  action: OutboxEventAction;
  aggregate: OutboxEventAggregate;
  payload: TPayload;
};

export async function createOne<TPayload>({
  type,
  version,
  action,
  aggregate,
  payload,
  correlationId = null,
  causationId = null,
}: CreateOutboxEventInput<TPayload>): Promise<OutboxEvent<TPayload>> {
  const date = new Date().toISOString();

  const outboxEvent = {
    type,
    version,
    action,
    service: "inventory",
    aggregate,
    occurredAt: date,
    correlationId,
    causationId,
    payload,
    status: "PENDING",
    publishedAt: null,
    deadLetteredAt: null,
    attempts: 0,
    nextAttemptAt: date,
    lastError: null,
    createdAt: date,
    updatedAt: date,
  } as const;

  return outboxEventRepository.createOne({
    outboxEvent,
  });
}

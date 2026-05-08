import {
  MarkOutboxEventAsFailed,
  MarkOutboxEventAsFailedRow,
  MarkOutboxEventAsPublished,
  MarkOutboxEventAsPublishedRow,
  NewOutboxEvent,
  NewOutboxEventRow,
  OutboxEvent,
  OutboxEventId,
  OutboxEventRow,
} from "../entities/outbox-event.entity.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

const OUTBOX_EVENT_RETURNING_COLUMNS = [
  "id",
  "event_type",
  "event_version",
  "action",
  "service",
  "aggregate_type",
  "aggregate_id",
  "payload",
  "correlation_id",
  "causation_id",
  "occurred_at",
  "status",
  "published_at",
  "dead_lettered_at",
  "attempts",
  "next_attempt_at",
  "last_error",
  "created_at",
  "updated_at",
];

export async function createOne<TPayload>({
  outboxEvent,
}: {
  outboxEvent: NewOutboxEvent<TPayload>;
}): Promise<OutboxEvent<TPayload>> {
  const db = getQueryBuilder();

  const outboxEventRowToCreate = transformToRow({ outboxEvent });

  const [createdOutboxEventRow] = (await db<OutboxEventRow>("outbox_events")
    .insert(outboxEventRowToCreate)
    .returning(OUTBOX_EVENT_RETURNING_COLUMNS)) as OutboxEventRow[];

  return transformFromRow<TPayload>({
    outboxEventRow: createdOutboxEventRow,
  });
}

export async function findManyPendingForPublishing({
  limit,
  now,
}: {
  limit: number;
  now: string;
}): Promise<OutboxEvent[]> {
  const db = getQueryBuilder();

  const outboxEventRows = (await db<OutboxEventRow>("outbox_events")
    .select(...OUTBOX_EVENT_RETURNING_COLUMNS)
    .where("status", "PENDING")
    .where("next_attempt_at", "<=", now)
    .orderBy("next_attempt_at", "asc")
    .orderBy("created_at", "asc")
    .orderBy("id", "asc")
    .forUpdate()
    .skipLocked()
    .limit(limit)) as OutboxEventRow[];

  return outboxEventRows.map((outboxEventRow) =>
    transformFromRow({ outboxEventRow }),
  );
}

export async function markOneAsPublished({
  outboxEventId,
  markOutboxEventAsPublished,
}: {
  outboxEventId: OutboxEventId;
  markOutboxEventAsPublished: MarkOutboxEventAsPublished;
}): Promise<OutboxEvent | null> {
  const db = getQueryBuilder();

  const outboxEventRowToUpdate = transformMarkAsPublishedToRow({
    markOutboxEventAsPublished,
  });

  const [updatedOutboxEventRow] = (await db<OutboxEventRow>("outbox_events")
    .where("id", outboxEventId)
    .update(outboxEventRowToUpdate)
    .returning(OUTBOX_EVENT_RETURNING_COLUMNS)) as OutboxEventRow[];

  if (!updatedOutboxEventRow) {
    return null;
  }

  return transformFromRow({ outboxEventRow: updatedOutboxEventRow });
}

export async function markOneAsFailed({
  outboxEventId,
  markOutboxEventAsFailed,
}: {
  outboxEventId: OutboxEventId;
  markOutboxEventAsFailed: MarkOutboxEventAsFailed;
}): Promise<OutboxEvent | null> {
  const db = getQueryBuilder();

  const outboxEventRowToUpdate = transformMarkAsFailedToRow({
    markOutboxEventAsFailed,
  });

  const [updatedOutboxEventRow] = (await db<OutboxEventRow>("outbox_events")
    .where("id", outboxEventId)
    .update(outboxEventRowToUpdate)
    .returning(OUTBOX_EVENT_RETURNING_COLUMNS)) as OutboxEventRow[];

  if (!updatedOutboxEventRow) {
    return null;
  }

  return transformFromRow({ outboxEventRow: updatedOutboxEventRow });
}

function transformToRow<TPayload>({
  outboxEvent,
}: {
  outboxEvent: NewOutboxEvent<TPayload>;
}): NewOutboxEventRow {
  return {
    event_type: outboxEvent.type,
    event_version: outboxEvent.version,
    action: outboxEvent.action,
    service: outboxEvent.service,
    aggregate_type: outboxEvent.aggregate.type,
    aggregate_id: outboxEvent.aggregate.id,
    payload: outboxEvent.payload,
    correlation_id: outboxEvent.correlationId,
    causation_id: outboxEvent.causationId,
    occurred_at: outboxEvent.occurredAt,
    status: outboxEvent.status,
    published_at: outboxEvent.publishedAt,
    dead_lettered_at: outboxEvent.deadLetteredAt,
    attempts: outboxEvent.attempts,
    next_attempt_at: outboxEvent.nextAttemptAt,
    last_error: outboxEvent.lastError,
    created_at: outboxEvent.createdAt,
    updated_at: outboxEvent.updatedAt,
  };
}

function transformMarkAsPublishedToRow({
  markOutboxEventAsPublished,
}: {
  markOutboxEventAsPublished: MarkOutboxEventAsPublished;
}): MarkOutboxEventAsPublishedRow {
  return {
    status: markOutboxEventAsPublished.status,
    published_at: markOutboxEventAsPublished.publishedAt,
    updated_at: markOutboxEventAsPublished.updatedAt,
  };
}

function transformMarkAsFailedToRow({
  markOutboxEventAsFailed,
}: {
  markOutboxEventAsFailed: MarkOutboxEventAsFailed;
}): MarkOutboxEventAsFailedRow {
  return {
    status: markOutboxEventAsFailed.status,
    attempts: markOutboxEventAsFailed.attempts,
    next_attempt_at: markOutboxEventAsFailed.nextAttemptAt,
    dead_lettered_at: markOutboxEventAsFailed.deadLetteredAt,
    last_error: markOutboxEventAsFailed.lastError,
    updated_at: markOutboxEventAsFailed.updatedAt,
  };
}

function transformFromRow<TPayload = unknown>({
  outboxEventRow,
}: {
  outboxEventRow: OutboxEventRow;
}): OutboxEvent<TPayload> {
  return {
    id: outboxEventRow.id,
    type: outboxEventRow.event_type,
    version: outboxEventRow.event_version,
    action: outboxEventRow.action,
    service: outboxEventRow.service,
    aggregate: {
      type: outboxEventRow.aggregate_type,
      id: outboxEventRow.aggregate_id,
    },
    occurredAt: toStringValue(outboxEventRow.occurred_at),
    correlationId: outboxEventRow.correlation_id,
    causationId: outboxEventRow.causation_id,
    payload: outboxEventRow.payload as TPayload,
    status: outboxEventRow.status,
    publishedAt:
      outboxEventRow.published_at === null
        ? null
        : toStringValue(outboxEventRow.published_at),
    deadLetteredAt:
      outboxEventRow.dead_lettered_at === null
        ? null
        : toStringValue(outboxEventRow.dead_lettered_at),
    attempts: outboxEventRow.attempts,
    nextAttemptAt:
      outboxEventRow.next_attempt_at === null
        ? null
        : toStringValue(outboxEventRow.next_attempt_at),
    lastError: outboxEventRow.last_error,
    createdAt: toStringValue(outboxEventRow.created_at),
    updatedAt: toStringValue(outboxEventRow.updated_at),
  };
}

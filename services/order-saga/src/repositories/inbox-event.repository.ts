import type {
  InboxEvent,
  InboxEventRow,
  MarkInboxEventAsFailed,
  MarkInboxEventAsFailedRow,
  MarkInboxEventAsProcessed,
  MarkInboxEventAsProcessedRow,
  MarkInboxEventAsProcessing,
  MarkInboxEventAsProcessingRow,
  NewInboxEvent,
  NewInboxEventRow,
} from "../entities/index.js";
import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";
import toStringValue from "../tools/to-string-value.js";

const INBOX_EVENT_RETURNING_COLUMNS = [
  "id",
  "event_id",
  "event_type",
  "event_version",
  "source_service",
  "aggregate_type",
  "aggregate_id",
  "topic",
  "partition",
  "message_offset",
  "payload",
  "headers",
  "status",
  "attempts",
  "next_attempt_at",
  "received_at",
  "processed_at",
  "dead_lettered_at",
  "last_error",
  "created_at",
  "updated_at",
];

export async function createOneOrFindExisting<TPayload = unknown>({
  inboxEvent,
}: {
  inboxEvent: NewInboxEvent<TPayload>;
}): Promise<{ inboxEvent: InboxEvent<TPayload>; created: boolean }> {
  const db = getQueryBuilder();

  const inboxEventRowToCreate = transformToRow({ inboxEvent });

  const [createdInboxEventRow] = (await db<InboxEventRow>("inbox_events")
    .insert(inboxEventRowToCreate)
    .onConflict("event_id")
    .ignore()
    .returning(INBOX_EVENT_RETURNING_COLUMNS)) as InboxEventRow[];

  if (createdInboxEventRow) {
    return {
      inboxEvent: transformFromRow({
        inboxEventRow: createdInboxEventRow,
      }),
      created: true,
    };
  }

  const existingInboxEvent = await findOneByEventId({
    eventId: inboxEvent.eventId,
  });

  if (!existingInboxEvent) {
    throw new Error(
      "Inbox event insert conflicted but no existing row was found.",
    );
  }

  return {
    inboxEvent: existingInboxEvent as InboxEvent<TPayload>,
    created: false,
  };
}

export async function findOneByEventId({
  eventId,
}: {
  eventId: string;
}): Promise<InboxEvent | null> {
  const db = getQueryBuilder();

  const inboxEventRow = (await db<InboxEventRow>("inbox_events")
    .select(INBOX_EVENT_RETURNING_COLUMNS)
    .where("event_id", eventId)
    .first()) as InboxEventRow | undefined;

  if (!inboxEventRow) {
    return null;
  }

  return transformFromRow({ inboxEventRow });
}

export async function markOneAsProcessing({
  eventId,
  markInboxEventAsProcessing,
}: {
  eventId: string;
  markInboxEventAsProcessing: MarkInboxEventAsProcessing;
}): Promise<InboxEvent | null> {
  const db = getQueryBuilder();

  const [updatedInboxEventRow] = (await db<InboxEventRow>("inbox_events")
    .where("event_id", eventId)
    .update(
      transformMarkAsProcessingToRow({
        markInboxEventAsProcessing,
      }),
    )
    .returning(INBOX_EVENT_RETURNING_COLUMNS)) as InboxEventRow[];

  if (!updatedInboxEventRow) {
    return null;
  }

  return transformFromRow({ inboxEventRow: updatedInboxEventRow });
}

export async function markOneAsProcessed({
  eventId,
  markInboxEventAsProcessed,
}: {
  eventId: string;
  markInboxEventAsProcessed: MarkInboxEventAsProcessed;
}): Promise<InboxEvent | null> {
  const db = getQueryBuilder();

  const [updatedInboxEventRow] = (await db<InboxEventRow>("inbox_events")
    .where("event_id", eventId)
    .update(
      transformMarkAsProcessedToRow({
        markInboxEventAsProcessed,
      }),
    )
    .returning(INBOX_EVENT_RETURNING_COLUMNS)) as InboxEventRow[];

  if (!updatedInboxEventRow) {
    return null;
  }

  return transformFromRow({ inboxEventRow: updatedInboxEventRow });
}

export async function markOneAsFailed({
  eventId,
  markInboxEventAsFailed,
}: {
  eventId: string;
  markInboxEventAsFailed: MarkInboxEventAsFailed;
}): Promise<InboxEvent | null> {
  const db = getQueryBuilder();

  const [updatedInboxEventRow] = (await db<InboxEventRow>("inbox_events")
    .where("event_id", eventId)
    .update(
      transformMarkAsFailedToRow({
        markInboxEventAsFailed,
      }),
    )
    .returning(INBOX_EVENT_RETURNING_COLUMNS)) as InboxEventRow[];

  if (!updatedInboxEventRow) {
    return null;
  }

  return transformFromRow({ inboxEventRow: updatedInboxEventRow });
}

function transformToRow<TPayload>({
  inboxEvent,
}: {
  inboxEvent: NewInboxEvent<TPayload>;
}): NewInboxEventRow {
  return {
    event_id: inboxEvent.eventId,
    event_type: inboxEvent.type,
    event_version: inboxEvent.version,
    source_service: inboxEvent.sourceService,
    aggregate_type: inboxEvent.aggregate.type,
    aggregate_id: inboxEvent.aggregate.id,
    topic: inboxEvent.topic,
    partition: inboxEvent.partition,
    message_offset: inboxEvent.messageOffset,
    payload: inboxEvent.payload,
    headers: inboxEvent.headers,
    status: inboxEvent.status,
    attempts: inboxEvent.attempts,
    next_attempt_at: inboxEvent.nextAttemptAt,
    received_at: inboxEvent.receivedAt,
    processed_at: inboxEvent.processedAt,
    dead_lettered_at: inboxEvent.deadLetteredAt,
    last_error: inboxEvent.lastError,
    created_at: inboxEvent.createdAt,
    updated_at: inboxEvent.updatedAt,
  };
}

function transformMarkAsProcessingToRow({
  markInboxEventAsProcessing,
}: {
  markInboxEventAsProcessing: MarkInboxEventAsProcessing;
}): MarkInboxEventAsProcessingRow {
  return {
    status: markInboxEventAsProcessing.status,
    attempts: markInboxEventAsProcessing.attempts,
    updated_at: markInboxEventAsProcessing.updatedAt,
  };
}

function transformMarkAsProcessedToRow({
  markInboxEventAsProcessed,
}: {
  markInboxEventAsProcessed: MarkInboxEventAsProcessed;
}): MarkInboxEventAsProcessedRow {
  return {
    status: markInboxEventAsProcessed.status,
    processed_at: markInboxEventAsProcessed.processedAt,
    updated_at: markInboxEventAsProcessed.updatedAt,
  };
}

function transformMarkAsFailedToRow({
  markInboxEventAsFailed,
}: {
  markInboxEventAsFailed: MarkInboxEventAsFailed;
}): MarkInboxEventAsFailedRow {
  return {
    status: markInboxEventAsFailed.status,
    attempts: markInboxEventAsFailed.attempts,
    next_attempt_at: markInboxEventAsFailed.nextAttemptAt,
    dead_lettered_at: markInboxEventAsFailed.deadLetteredAt,
    last_error: markInboxEventAsFailed.lastError,
    updated_at: markInboxEventAsFailed.updatedAt,
  };
}

function transformFromRow<TPayload = unknown>({
  inboxEventRow,
}: {
  inboxEventRow: InboxEventRow;
}): InboxEvent<TPayload> {
  return {
    id: inboxEventRow.id,
    eventId: inboxEventRow.event_id,
    type: inboxEventRow.event_type,
    version: inboxEventRow.event_version,
    sourceService: inboxEventRow.source_service,
    aggregate: {
      type: inboxEventRow.aggregate_type,
      id: inboxEventRow.aggregate_id,
    },
    topic: inboxEventRow.topic,
    partition: inboxEventRow.partition,
    messageOffset: inboxEventRow.message_offset,
    payload: inboxEventRow.payload as TPayload,
    headers: inboxEventRow.headers,
    status: inboxEventRow.status,
    attempts: inboxEventRow.attempts,
    nextAttemptAt:
      inboxEventRow.next_attempt_at === null
        ? null
        : toStringValue(inboxEventRow.next_attempt_at),
    receivedAt: toStringValue(inboxEventRow.received_at),
    processedAt:
      inboxEventRow.processed_at === null
        ? null
        : toStringValue(inboxEventRow.processed_at),
    deadLetteredAt:
      inboxEventRow.dead_lettered_at === null
        ? null
        : toStringValue(inboxEventRow.dead_lettered_at),
    lastError: inboxEventRow.last_error,
    createdAt: toStringValue(inboxEventRow.created_at),
    updatedAt: toStringValue(inboxEventRow.updated_at),
  };
}

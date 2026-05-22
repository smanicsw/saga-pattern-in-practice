export type InboxEventId = string;
export type InboxEventSourceService = "order" | "inventory" | "payments";
export type InboxEventStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "DEAD_LETTERED";

export type InboxEventAggregate = {
  type: string;
  id: string;
};

export type InboxEvent<TPayload = unknown> = {
  id: InboxEventId;
  eventId: string;
  type: string;
  version: number;
  sourceService: InboxEventSourceService;
  aggregate: InboxEventAggregate;
  topic: string;
  partition: number | null;
  messageOffset: string | null;
  payload: TPayload;
  headers: Record<string, unknown>;
  status: InboxEventStatus;
  attempts: number;
  nextAttemptAt: string | null;
  receivedAt: string;
  processedAt: string | null;
  deadLetteredAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxEventRow = {
  id: InboxEventId;
  event_id: string;
  event_type: string;
  event_version: number;
  source_service: InboxEventSourceService;
  aggregate_type: string;
  aggregate_id: string;
  topic: string;
  partition: number | null;
  message_offset: string | null;
  payload: unknown;
  headers: Record<string, unknown>;
  status: InboxEventStatus;
  attempts: number;
  next_attempt_at: string | null;
  received_at: string;
  processed_at: string | null;
  dead_lettered_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type NewInboxEvent<TPayload = unknown> = Omit<
  InboxEvent<TPayload>,
  "id"
>;

export type NewInboxEventRow = Omit<InboxEventRow, "id">;

export type MarkInboxEventAsProcessing = Pick<
  InboxEvent,
  "status" | "attempts" | "updatedAt"
>;

export type MarkInboxEventAsProcessingRow = Pick<
  InboxEventRow,
  "status" | "attempts" | "updated_at"
>;

export type MarkInboxEventAsProcessed = Pick<
  InboxEvent,
  "status" | "processedAt" | "updatedAt"
>;

export type MarkInboxEventAsProcessedRow = Pick<
  InboxEventRow,
  "status" | "processed_at" | "updated_at"
>;

export type MarkInboxEventAsFailed = Pick<
  InboxEvent,
  | "status"
  | "attempts"
  | "nextAttemptAt"
  | "deadLetteredAt"
  | "lastError"
  | "updatedAt"
>;

export type MarkInboxEventAsFailedRow = Pick<
  InboxEventRow,
  | "status"
  | "attempts"
  | "next_attempt_at"
  | "dead_lettered_at"
  | "last_error"
  | "updated_at"
>;

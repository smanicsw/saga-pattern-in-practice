export type OutboxEventId = string;

export type OutboxEventAction = "create" | "update" | "delete";

export type OutboxEventStatus = "PENDING" | "PUBLISHED" | "DEAD_LETTERED";

export type OutboxEventAggregate = {
  type: string;
  id: string;
};

export type OutboxEventMetadata = {
  correlationId?: string | null;
  causationId?: string | null;
};

export type OutboxEvent<
  TPayload = unknown,
  TService extends string = string,
> = {
  id: OutboxEventId;
  type: string;
  version: number;
  action: OutboxEventAction;
  service: TService;
  aggregate: OutboxEventAggregate;
  occurredAt: string;
  correlationId: string | null;
  causationId: string | null;
  payload: TPayload;
  status: OutboxEventStatus;
  publishedAt: string | null;
  deadLetteredAt: string | null;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OutboxEventRow<TService extends string = string> = {
  id: OutboxEventId;
  event_type: string;
  event_version: number;
  action: OutboxEventAction;
  service: TService;
  aggregate_type: string;
  aggregate_id: string;
  payload: unknown;
  correlation_id: string | null;
  causation_id: string | null;
  occurred_at: string;
  status: OutboxEventStatus;
  published_at: string | null;
  dead_lettered_at: string | null;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type NewOutboxEvent<
  TPayload = unknown,
  TService extends string = string,
> = Omit<OutboxEvent<TPayload, TService>, "id">;

export type NewOutboxEventRow<TService extends string = string> = Omit<
  OutboxEventRow<TService>,
  "id"
>;

export type MarkOutboxEventAsPublished = {
  status: Extract<OutboxEventStatus, "PUBLISHED">;
  publishedAt: string;
  updatedAt: string;
};

export type MarkOutboxEventAsPublishedRow = {
  status: Extract<OutboxEventStatus, "PUBLISHED">;
  published_at: string;
  updated_at: string;
};

export type MarkOutboxEventAsFailed = {
  status: Extract<OutboxEventStatus, "PENDING" | "DEAD_LETTERED">;
  attempts: number;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
  lastError: string;
  updatedAt: string;
};

export type MarkOutboxEventAsFailedRow = {
  status: Extract<OutboxEventStatus, "PENDING" | "DEAD_LETTERED">;
  attempts: number;
  next_attempt_at: string | null;
  dead_lettered_at: string | null;
  last_error: string;
  updated_at: string;
};

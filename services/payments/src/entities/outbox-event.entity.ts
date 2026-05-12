import type {
  MarkOutboxEventAsFailed as BaseMarkOutboxEventAsFailed,
  MarkOutboxEventAsFailedRow as BaseMarkOutboxEventAsFailedRow,
  MarkOutboxEventAsPublished as BaseMarkOutboxEventAsPublished,
  MarkOutboxEventAsPublishedRow as BaseMarkOutboxEventAsPublishedRow,
  NewOutboxEvent as BaseNewOutboxEvent,
  NewOutboxEventRow as BaseNewOutboxEventRow,
  OutboxEvent as BaseOutboxEvent,
  OutboxEventRow as BaseOutboxEventRow,
} from "@saga/outbox-kit";

export type {
  OutboxEventAction,
  OutboxEventAggregate,
  OutboxEventId,
  OutboxEventMetadata,
  OutboxEventStatus,
} from "@saga/outbox-kit";

export type OutboxEventService = "payments";

export type OutboxEvent<TPayload = unknown> = BaseOutboxEvent<
  TPayload,
  OutboxEventService
>;

export type OutboxEventRow = BaseOutboxEventRow<OutboxEventService>;

export type NewOutboxEvent<TPayload = unknown> = BaseNewOutboxEvent<
  TPayload,
  OutboxEventService
>;

export type NewOutboxEventRow = BaseNewOutboxEventRow<OutboxEventService>;

export type MarkOutboxEventAsPublished = BaseMarkOutboxEventAsPublished;

export type MarkOutboxEventAsPublishedRow = BaseMarkOutboxEventAsPublishedRow;

export type MarkOutboxEventAsFailed = BaseMarkOutboxEventAsFailed;

export type MarkOutboxEventAsFailedRow = BaseMarkOutboxEventAsFailedRow;

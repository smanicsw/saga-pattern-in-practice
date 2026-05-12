import type {
  OutboxEvent,
  OutboxEventAction,
  OutboxEventAggregate,
  OutboxEventMetadata,
} from "./entities.js";
import type { OutboxEventRepository } from "./repository.js";

export type CreateOutboxEventInput<TPayload> = OutboxEventMetadata & {
  type: string;
  version: number;
  action: OutboxEventAction;
  aggregate: OutboxEventAggregate;
  payload: TPayload;
};

export function createOutboxEventManager<TService extends string>({
  service,
  repository,
}: {
  service: TService;
  repository: Pick<OutboxEventRepository<TService>, "createOne">;
}) {
  async function createOne<TPayload>({
    type,
    version,
    action,
    aggregate,
    payload,
    correlationId = null,
    causationId = null,
  }: CreateOutboxEventInput<TPayload>): Promise<
    OutboxEvent<TPayload, TService>
  > {
    const date = new Date().toISOString();

    const outboxEvent = {
      type,
      version,
      action,
      service,
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

    return repository.createOne({
      outboxEvent,
    });
  }

  return {
    createOne,
  };
}

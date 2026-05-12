import { createOutboxEventRepository } from "@saga/outbox-kit";

import { getQueryBuilder } from "../infrastructure/adapters/database/index.js";

const outboxEventRepository = createOutboxEventRepository<"payments">({
  getQueryBuilder,
});

export const createOne = outboxEventRepository.createOne;
export const findManyPendingForPublishing =
  outboxEventRepository.findManyPendingForPublishing;
export const markOneAsPublished = outboxEventRepository.markOneAsPublished;
export const markOneAsFailed = outboxEventRepository.markOneAsFailed;

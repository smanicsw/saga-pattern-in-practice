import {
  createOutboxEventManager,
  type CreateOutboxEventInput,
} from "@saga/outbox-kit";

import * as outboxEventRepository from "../repositories/outbox-event.repository.js";

export type { CreateOutboxEventInput };

const outboxEventManager = createOutboxEventManager({
  service: "payments",
  repository: outboxEventRepository,
});

export const createOne = outboxEventManager.createOne;

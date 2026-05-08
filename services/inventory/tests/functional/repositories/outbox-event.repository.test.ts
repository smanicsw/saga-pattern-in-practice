import { randomUUID } from "node:crypto";

import type { NewOutboxEvent } from "../../../src/entities/outbox-event.entity.js";
import * as outboxEventRepository from "../../../src/repositories/outbox-event.repository.js";
import { setupTestDatabaseHooks } from "../../utils/database.js";

describe("outbox event repository", () => {
  setupTestDatabaseHooks();

  describe("Success", () => {
    it("should find only pending events ready for publishing", async () => {
      const readyEvent = await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent({
          nextAttemptAt: "2026-05-08T10:00:00.000Z",
          createdAt: "2026-05-08T10:00:00.000Z",
        }),
      });
      await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent({
          nextAttemptAt: "2026-05-08T10:10:00.000Z",
          createdAt: "2026-05-08T10:01:00.000Z",
        }),
      });
      await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent({
          status: "PUBLISHED",
          publishedAt: "2026-05-08T10:01:00.000Z",
          nextAttemptAt: "2026-05-08T10:00:00.000Z",
        }),
      });
      await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent({
          status: "DEAD_LETTERED",
          deadLetteredAt: "2026-05-08T10:02:00.000Z",
          attempts: 10,
          nextAttemptAt: null,
          lastError: "Broker is unavailable.",
        }),
      });

      const outboxEvents =
        await outboxEventRepository.findManyPendingForPublishing({
          limit: 10,
          now: "2026-05-08T10:05:00.000Z",
        });

      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0]).toMatchObject({
        id: readyEvent.id,
        status: "PENDING",
        nextAttemptAt: "2026-05-08T10:00:00.000Z",
      });
    });

    it("should mark one event as published", async () => {
      const outboxEvent = await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent(),
      });

      const updatedOutboxEvent =
        await outboxEventRepository.markOneAsPublished({
          outboxEventId: outboxEvent.id,
          markOutboxEventAsPublished: {
            status: "PUBLISHED",
            publishedAt: "2026-05-08T10:01:00.000Z",
            updatedAt: "2026-05-08T10:01:00.000Z",
          },
        });

      expect(updatedOutboxEvent).toMatchObject({
        id: outboxEvent.id,
        status: "PUBLISHED",
        publishedAt: "2026-05-08T10:01:00.000Z",
        deadLetteredAt: null,
        attempts: 0,
      });

      const outboxEvents =
        await outboxEventRepository.findManyPendingForPublishing({
          limit: 10,
          now: "2026-05-08T10:05:00.000Z",
        });

      expect(outboxEvents).toHaveLength(0);
    });

    it("should mark one failed event as pending for retry", async () => {
      const outboxEvent = await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent(),
      });

      const updatedOutboxEvent = await outboxEventRepository.markOneAsFailed({
        outboxEventId: outboxEvent.id,
        markOutboxEventAsFailed: {
          status: "PENDING",
          attempts: 1,
          nextAttemptAt: "2026-05-08T10:02:00.000Z",
          deadLetteredAt: null,
          lastError: "Broker is unavailable.",
          updatedAt: "2026-05-08T10:00:00.000Z",
        },
      });

      expect(updatedOutboxEvent).toMatchObject({
        id: outboxEvent.id,
        status: "PENDING",
        attempts: 1,
        nextAttemptAt: "2026-05-08T10:02:00.000Z",
        deadLetteredAt: null,
        lastError: "Broker is unavailable.",
      });
    });

    it("should mark one failed event as dead-lettered", async () => {
      const outboxEvent = await outboxEventRepository.createOne({
        outboxEvent: buildNewOutboxEvent({
          attempts: 9,
        }),
      });

      const updatedOutboxEvent = await outboxEventRepository.markOneAsFailed({
        outboxEventId: outboxEvent.id,
        markOutboxEventAsFailed: {
          status: "DEAD_LETTERED",
          attempts: 10,
          nextAttemptAt: null,
          deadLetteredAt: "2026-05-08T10:03:00.000Z",
          lastError: "Broker is unavailable.",
          updatedAt: "2026-05-08T10:03:00.000Z",
        },
      });

      expect(updatedOutboxEvent).toMatchObject({
        id: outboxEvent.id,
        status: "DEAD_LETTERED",
        attempts: 10,
        nextAttemptAt: null,
        deadLetteredAt: "2026-05-08T10:03:00.000Z",
        lastError: "Broker is unavailable.",
      });

      const outboxEvents =
        await outboxEventRepository.findManyPendingForPublishing({
          limit: 10,
          now: "2026-05-08T10:05:00.000Z",
        });

      expect(outboxEvents).toHaveLength(0);
    });
  });
});

function buildNewOutboxEvent(
  overrides: Partial<NewOutboxEvent<{ name: string }>> = {},
): NewOutboxEvent<{ name: string }> {
  return {
    type: "inventory.product.created",
    version: 1,
    action: "create",
    service: "inventory",
    aggregate: {
      type: "product",
      id: randomUUID(),
    },
    occurredAt: "2026-05-08T10:00:00.000Z",
    correlationId: null,
    causationId: null,
    payload: {
      name: "Keyboard",
    },
    status: "PENDING",
    publishedAt: null,
    deadLetteredAt: null,
    attempts: 0,
    nextAttemptAt: "2026-05-08T10:00:00.000Z",
    lastError: null,
    createdAt: "2026-05-08T10:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
    ...overrides,
  };
}

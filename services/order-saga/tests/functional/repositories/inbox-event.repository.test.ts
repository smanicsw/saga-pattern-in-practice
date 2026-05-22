import { randomUUID } from "node:crypto";

import type { NewInboxEvent } from "../../../src/entities/inbox-event.entity.js";
import * as inboxEventRepository from "../../../src/repositories/inbox-event.repository.js";
import { setupTestDatabaseHooks } from "../../utils/database.js";

describe("inbox event repository", () => {
  setupTestDatabaseHooks();

  describe("Success", () => {
    it("should create a new inbox event", async () => {
      const eventId = randomUUID();

      const result = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent({
          eventId,
        }),
      });

      expect(result.created).toBe(true);
      expect(result.inboxEvent).toMatchObject({
        eventId,
        type: "inventory.reservation.created",
        sourceService: "inventory",
        status: "PENDING",
      });
    });

    it("should return an existing inbox event when the event id already exists", async () => {
      const eventId = randomUUID();

      const firstResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent({
          eventId,
        }),
      });

      const secondResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent({
          eventId,
          payload: {
            reservationId: randomUUID(),
          },
        }),
      });

      expect(firstResult.created).toBe(true);
      expect(secondResult.created).toBe(false);
      expect(secondResult.inboxEvent).toMatchObject({
        id: firstResult.inboxEvent.id,
        payload: firstResult.inboxEvent.payload,
      });
    });

    it("should find one inbox event by event id", async () => {
      const createdResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent(),
      });

      const inboxEvent = await inboxEventRepository.findOneByEventId({
        eventId: createdResult.inboxEvent.eventId,
      });

      expect(inboxEvent).toMatchObject({
        id: createdResult.inboxEvent.id,
      });
    });

    it("should mark one inbox event as processing", async () => {
      const createdResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent(),
      });

      const inboxEvent = await inboxEventRepository.markOneAsProcessing({
        eventId: createdResult.inboxEvent.eventId,
        markInboxEventAsProcessing: {
          status: "PROCESSING",
          attempts: 1,
          updatedAt: "2026-05-21T10:01:00.000Z",
        },
      });

      expect(inboxEvent).toMatchObject({
        id: createdResult.inboxEvent.id,
        status: "PROCESSING",
        attempts: 1,
      });
    });

    it("should mark one inbox event as processed", async () => {
      const createdResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent(),
      });

      const inboxEvent = await inboxEventRepository.markOneAsProcessed({
        eventId: createdResult.inboxEvent.eventId,
        markInboxEventAsProcessed: {
          status: "PROCESSED",
          processedAt: "2026-05-21T10:02:00.000Z",
          updatedAt: "2026-05-21T10:02:00.000Z",
        },
      });

      expect(inboxEvent).toMatchObject({
        id: createdResult.inboxEvent.id,
        status: "PROCESSED",
        processedAt: "2026-05-21T10:02:00.000Z",
      });
    });

    it("should mark one inbox event as failed", async () => {
      const createdResult = await inboxEventRepository.createOneOrFindExisting({
        inboxEvent: buildNewInboxEvent(),
      });

      const inboxEvent = await inboxEventRepository.markOneAsFailed({
        eventId: createdResult.inboxEvent.eventId,
        markInboxEventAsFailed: {
          status: "FAILED",
          attempts: 1,
          nextAttemptAt: "2026-05-21T10:03:00.000Z",
          deadLetteredAt: null,
          lastError: "Handler failed.",
          updatedAt: "2026-05-21T10:02:00.000Z",
        },
      });

      expect(inboxEvent).toMatchObject({
        id: createdResult.inboxEvent.id,
        status: "FAILED",
        attempts: 1,
        nextAttemptAt: "2026-05-21T10:03:00.000Z",
        deadLetteredAt: null,
        lastError: "Handler failed.",
      });
    });
  });
});

function buildNewInboxEvent(
  overrides: Partial<NewInboxEvent<{ reservationId: string }>> = {},
): NewInboxEvent<{ reservationId: string }> {
  return {
    eventId: randomUUID(),
    type: "inventory.reservation.created",
    version: 1,
    sourceService: "inventory",
    aggregate: {
      type: "reservation",
      id: randomUUID(),
    },
    topic: "outbox-events.inventory",
    partition: 0,
    messageOffset: "1",
    payload: {
      reservationId: randomUUID(),
    },
    headers: {
      eventType: "inventory.reservation.created",
    },
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: "2026-05-21T10:00:00.000Z",
    receivedAt: "2026-05-21T10:00:00.000Z",
    processedAt: null,
    deadLetteredAt: null,
    lastError: null,
    createdAt: "2026-05-21T10:00:00.000Z",
    updatedAt: "2026-05-21T10:00:00.000Z",
    ...overrides,
  };
}

import {
  buildFailedPublishUpdate,
  calculateNextAttemptAt,
} from "../../../src/outbox/worker.js";

describe("outbox worker", () => {
  describe("Success", () => {
    it("should calculate the next retry attempt using exponential backoff", () => {
      const result = calculateNextAttemptAt({
        attempts: 2,
        failedAt: "2026-05-08T10:00:00.000Z",
      });

      expect(result).toEqual("2026-05-08T10:00:04.000Z");
    });

    it("should schedule a retry while max attempts has not been reached", () => {
      const result = buildFailedPublishUpdate({
        currentAttempts: 8,
        failedAt: "2026-05-08T10:00:00.000Z",
        lastError: "Broker is unavailable.",
      });

      expect(result).toEqual({
        status: "PENDING",
        attempts: 9,
        nextAttemptAt: "2026-05-08T10:01:00.000Z",
        deadLetteredAt: null,
        lastError: "Broker is unavailable.",
        updatedAt: "2026-05-08T10:00:00.000Z",
      });
    });

    it("should dead-letter an event when max attempts is reached", () => {
      const result = buildFailedPublishUpdate({
        currentAttempts: 9,
        failedAt: "2026-05-08T10:00:00.000Z",
        lastError: "Broker is unavailable.",
      });

      expect(result).toEqual({
        status: "DEAD_LETTERED",
        attempts: 10,
        nextAttemptAt: null,
        deadLetteredAt: "2026-05-08T10:00:00.000Z",
        lastError: "Broker is unavailable.",
        updatedAt: "2026-05-08T10:00:00.000Z",
      });
    });
  });
});

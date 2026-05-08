import {
  CAUSATION_ID_HEADER,
  CORRELATION_ID_HEADER,
} from "../../../src/constants/index.js";
import getOutboxEventMetadata from "../../../src/tools/get-outbox-event-metadata.js";

describe("getOutboxEventMetadata", () => {
  describe("Success", () => {
    it("should return null metadata if headers are not provided", () => {
      const result = getOutboxEventMetadata({
        headers: {},
      });

      expect(result).toEqual({
        correlationId: null,
        causationId: null,
      });
    });

    it("should return metadata if valid headers are provided", () => {
      const correlationId = "f07b8d0d-7fd4-4d91-91b7-8375903e6d1c";
      const causationId = "a8b16c2d-874f-4dd6-bcdb-19058d15c802";

      const result = getOutboxEventMetadata({
        headers: {
          [CORRELATION_ID_HEADER]: correlationId,
          [CAUSATION_ID_HEADER]: causationId,
        },
      });

      expect(result).toEqual({
        correlationId,
        causationId,
      });
    });
  });

  describe("Error", () => {
    it("should throw an invalid_request error if a metadata header is invalid", () => {
      expect(() =>
        getOutboxEventMetadata({
          headers: {
            [CORRELATION_ID_HEADER]: "not-a-correlation-id",
          },
        }),
      ).toThrow("Invalid request.");
    });
  });
});

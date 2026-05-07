import toStringValue from "../../../src/tools/to-string-value.js";

describe("toStringValue", () => {
  describe("Success", () => {
    it("should succeed in returning an ISO string when value is a date", () => {
      const result = toStringValue(new Date("2026-05-05T10:00:00.000Z"));

      expect(result).toEqual("2026-05-05T10:00:00.000Z");
    });

    it("should succeed in returning the same string when value is a string", () => {
      const result = toStringValue("2026-05-05T10:00:00.000Z");

      expect(result).toEqual("2026-05-05T10:00:00.000Z");
    });
  });

  describe("Error", () => {
    it("should throw an error if value is null", () => {
      expect(() => toStringValue(null)).toThrow("expected non-null DB value");
    });

    it("should throw an error if value is undefined", () => {
      expect(() => toStringValue(undefined)).toThrow(
        "expected non-null DB value",
      );
    });
  });
});

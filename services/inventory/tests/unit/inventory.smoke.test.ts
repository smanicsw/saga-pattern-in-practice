import { Value } from "@sinclair/typebox/value";

import { CreateOneBody } from "../../src/routes/schemas/products.schema.js";

describe("inventory service test setup", () => {
  it("parses create product request payload", async () => {
    const payload = Value.Parse(CreateOneBody, {
      sku: "SKU-123",
      name: "Keyboard",
      price: 49.99,
    });

    expect(payload.sku).toBe("SKU-123");
    expect(payload.name).toBe("Keyboard");
    expect(payload.price).toBe(49.99);
  });
});

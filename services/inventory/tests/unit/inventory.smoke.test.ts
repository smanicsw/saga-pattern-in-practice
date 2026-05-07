import { Value } from "@sinclair/typebox/value";

import { CreateOneProductBody } from "../../src/routes/schemas/products.schema.js";

describe("inventory service test setup", () => {
  it("parses create product request payload", async () => {
    const payload = Value.Parse(CreateOneProductBody, {
      sku: "SKU-123",
      name: "Keyboard",
      price: 49.99,
    });

    expect(payload.sku).toEqual("SKU-123");
    expect(payload.name).toEqual("Keyboard");
    expect(payload.price).toEqual(49.99);
  });
});

import { createPaymentManager } from "../../managers/index.js";

describe("payments service test setup", () => {
  it("returns payments overview", async () => {
    const manager = createPaymentManager({});

    const overview = await manager.getOverview();

    expect(overview.message).toBe("Payments service is running");
    expect(overview.totalPayments).toBe(0);
  });
});

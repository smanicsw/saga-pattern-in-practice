import { createOrderManager } from "../../managers/index.js";

describe("order service test setup", () => {
  it("returns order overview", async () => {
    const manager = createOrderManager({});

    const overview = await manager.getOverview();

    expect(overview.message).toBe("Order service is running");
    expect(overview.totalOrders).toBe(0);
  });
});

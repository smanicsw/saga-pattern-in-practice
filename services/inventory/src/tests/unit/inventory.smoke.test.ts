import { createInventoryManager } from "../../managers/index.js";

describe("inventory service test setup", () => {
  it("returns inventory overview", async () => {
    const manager = createInventoryManager({});

    const overview = await manager.getOverview();

    expect(overview.message).toBe("Inventory service is running");
    expect(overview.totalItems).toBe(0);
  });
});

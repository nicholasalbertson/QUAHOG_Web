// §2.11.4 shared sim boot — both builds boot from the same sim singleton.
import { describe, it, expect } from "vitest";
import { sim } from "../sim/SimRuntime";

describe("§2.11.4 both builds boot from the same sim", () => {
  it("the sim is a single module singleton (same instance from any importer)", async () => {
    // Import it a second time through a different path — module singletons
    // resolve to the same instance.
    const again = (await import("../sim/SimRuntime")).sim;
    expect(again).toBe(sim);
    expect(sim.clock).toBeDefined();
    expect(sim.loop).toBeDefined();
    expect(typeof sim.bindSlice).toBe("function");
    expect(typeof sim.tickNav).toBe("function");
    expect(typeof sim.setNavGoal).toBe("function");
  });

  it("the earth bridge boots the sim (bindSlice + loop + clock + nav)", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../earth/EarthSimBridge.tsx", import.meta.url), "utf-8"),
    );
    expect(src).toContain("sim.bindSlice(slice)");
    expect(src).toContain("sim.loop.start()");
    expect(src).toContain("sim.clock.syncFromShared");
    expect(src).toContain("sim.tickNav");
    expect(src).toContain("sim.setNavGoal");
    // And the stylized bootstrap boots the same sim (not a second one).
    const boot = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../sim/SimBootstrap.tsx", import.meta.url), "utf-8"),
    );
    expect(boot).toContain('import { sim } from "./SimRuntime"');
    expect(boot).toContain("sim.bindSlice(slice)");
    expect(boot).toContain("sim.loop.start()");
  });

  it("earth does not duplicate the sim stack (no second MissionRuntime/SaveGame)", async () => {
    const fs = await import("node:fs");
    const bridge = fs.readFileSync(new URL("../earth/EarthSimBridge.tsx", import.meta.url), "utf-8");
    // The bridge USES the shared stores/sim — it does not define its own.
    expect(bridge).not.toContain("new MissionRuntime");
    expect(bridge).not.toContain("new SimRuntime");
    expect(bridge).toContain('from "../mission"');
    expect(bridge).toContain('from "../sim/SimRuntime"');
  });
});

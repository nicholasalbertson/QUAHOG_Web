import { describe, expect, it } from "vitest";
import { SignalFsm, makeSignalBank } from "../../sim/SignalFsm";

describe("SignalFsm", () => {
  it("cycles green → yellow → red", () => {
    const s = new SignalFsm({ greenSec: 2, yellowSec: 1, redSec: 2, phaseOffsetSec: 0 });
    expect(s.advance(0)).toBe("green");
    expect(s.advance(1.5)).toBe("green");
    expect(s.advance(0.6)).toBe("yellow");
    expect(s.advance(1.0)).toBe("red");
    expect(s.advance(2.0)).toBe("green");
  });

  it("shouldStop on yellow and red", () => {
    const s = new SignalFsm({ greenSec: 1, yellowSec: 1, redSec: 1 });
    s.advance(0);
    expect(s.shouldStop()).toBe(false);
    s.advance(1.1);
    expect(s.shouldStop()).toBe(true);
  });

  it("makeSignalBank staggers phases", () => {
    // Short green so cycle/3 offset lands past green for bank[1].
    const bank = makeSignalBank(3, { greenSec: 1, yellowSec: 1, redSec: 1 });
    expect(bank).toHaveLength(3);
    expect(bank[0].state).toBe("green");
    expect(bank[1].state).not.toBe(bank[0].state);
  });
});

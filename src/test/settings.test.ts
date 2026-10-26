import { describe, expect, it } from "vitest";
import { cleanSettings, DEFAULT_SETTINGS, shakeMul } from "@/game/meta/settings";

describe("settings", () => {
  it("broken saves fall back to defaults", () => { expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS); expect(cleanSettings({ music: "loud", shake: "max" })).toEqual(DEFAULT_SETTINGS); });
  it("volumes clamp to 0..100%, brightness to 60..140%", () => {
    const s = cleanSettings({ music: 3, fx: -1, brightness: 9 });
    expect(s.music).toBe(1); expect(s.fx).toBe(0); expect(s.brightness).toBe(1.4);
  });
  it("screen shake: full, weak (35%), off", () => { expect(shakeMul("full")).toBe(1); expect(shakeMul("low")).toBe(0.35); expect(shakeMul("off")).toBe(0); });
});

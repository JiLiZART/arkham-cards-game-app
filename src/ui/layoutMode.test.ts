import { describe, expect, it } from "vitest";
import { DESKTOP_INSETS, insetsFor, layoutModeOf, PHONE_INSETS, viewportOf } from "./layoutMode";

describe("layoutModeOf", () => {
  it("a phone held sideways is the phone layout", () => {
    expect(layoutModeOf(852, 393)).toEqual({ mode: "phone", portrait: false });
    expect(layoutModeOf(915, 412)).toEqual({ mode: "phone", portrait: false });
  });

  it("a short or narrow landscape screen is the phone layout, the bounds included", () => {
    expect(layoutModeOf(900, 500).mode).toBe("phone");
    expect(layoutModeOf(1280, 500).mode).toBe("phone");
    expect(layoutModeOf(901, 501).mode).toBe("desktop");
  });

  it("laptops and tablets in landscape keep the desktop layout", () => {
    expect(layoutModeOf(1366, 768)).toEqual({ mode: "desktop", portrait: false });
    expect(layoutModeOf(1600, 900).mode).toBe("desktop");
    expect(layoutModeOf(1024, 768).mode).toBe("desktop");
  });

  it("a phone held upright is the phone layout in portrait (the rotate card); a tablet upright stays desktop", () => {
    expect(layoutModeOf(393, 852)).toEqual({ mode: "phone", portrait: true });
    expect(layoutModeOf(768, 1024)).toEqual({ mode: "desktop", portrait: true });
  });
});

describe("the desktop insets", () => {
  it("keep the strip's column and the feed free on the right, and no row of cards at the bottom", () => {
    expect(DESKTOP_INSETS.right).toBeGreaterThanOrEqual(143 + 300 + 24); // the column, the feed band and their margins
    expect(DESKTOP_INSETS.bottom).toBeLessThanOrEqual(200); // the hand fan's peek and the stat bar: the strip is no longer a row here
  });
});

describe("insetsFor", () => {
  it("the desktop insets are the fixed panels'", () => {
    expect(insetsFor("desktop")).toEqual(DESKTOP_INSETS);
  });

  it("the phone insets are the bar, the strip column and the hand drawer, plus the safe areas", () => {
    expect(insetsFor("phone")).toEqual(PHONE_INSETS);
    expect(insetsFor("phone", { top: 0, right: 47, bottom: 21, left: 47 })).toEqual({ top: PHONE_INSETS.top, right: PHONE_INSETS.right + 47, bottom: PHONE_INSETS.bottom + 21, left: 47 });
  });
});

describe("viewportOf", () => {
  it("reads the window", () => {
    expect(viewportOf({ innerWidth: 852, innerHeight: 393 })).toEqual({ width: 852, height: 393 });
  });
});

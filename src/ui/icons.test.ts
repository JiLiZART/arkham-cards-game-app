import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICON_FILES, iconUrl, MARKUP_ICONS, type IconName } from "./icons";

describe("icons", () => {
  it("every mapped icon exists in public/icons", () => {
    const missing = (Object.keys(ICON_FILES) as IconName[]).filter((n) => !existsSync(`public${iconUrl(n)}`));
    expect(missing).toEqual([]);
  });
  it("markup keys map to known icons", () => {
    for (const n of Object.values(MARKUP_ICONS)) expect(ICON_FILES[n]).toBeDefined();
  });
  it("the table background exists", () => {
    expect(existsSync("public/table/parchment.jpg")).toBe(true);
  });
});

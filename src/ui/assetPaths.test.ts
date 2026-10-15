import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

describe("asset paths", () => {
  // the site runs under a sub-path on GitHub Pages: public files go through asset() (src/ui/images.ts), never "/..."
  it("no hard-coded root paths to public files in src", () => {
    const bad: string[] = [];
    for (const f of walk("src").filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))) {
      readFileSync(f, "utf8").split("\n").forEach((line, k) => {
        if (/["'`]\/(cards|icons|table|fonts)\//.test(line) || /["'`]\/cards["'`]/.test(line)) bad.push(`${f}:${k + 1}: ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

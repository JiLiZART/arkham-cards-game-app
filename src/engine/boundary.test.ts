/** The core owns the state's shape (ADR-0022): the mutable record lookups are for it alone. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

describe("the engine's core boundary", () => {
  it("only the core imports the mutable record lookups", () => {
    const importers = [...walk("src"), ...walk("content"), ...walk("scripts")]
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith("records.ts"))
      .filter((f) => /from\s+"[./]*(?:engine\/)?records"/.test(readFileSync(f, "utf8")));
    expect(importers).toEqual(["src/engine/core.ts"]);
  });
});

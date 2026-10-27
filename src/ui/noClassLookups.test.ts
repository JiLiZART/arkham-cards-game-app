import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// CSS Modules hash class names (ADR-0016): code finds rendered elements by data attribute, never by class
const root = join(__dirname);
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

/** a selector that names a class: a `.name` at its start or after a space, comma, combinator or attribute */
const namesClass = (selector: string) => /(^|[\s,>+~\])])\.[A-Za-z_-]/.test(selector);
const LOOKUP =
  /\b(?:querySelector|querySelectorAll|closest|matches)\s*(?:<[^>]*>)?\(\s*(["'`])((?:(?!\1).)*)\1/g;

describe("DOM lookups go by data attribute", () => {
  it("no querySelector, closest or matches call in src/ui names a class", () => {
    const found = sources(root).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(LOOKUP)]
        .filter((m) => namesClass(m[2]))
        .map((m) => `${relative(root, file)}: ${m[2]}`),
    );
    expect(found).toEqual([]);
  });

  it("the places flights go to and from are data attributes", () => {
    const file = sources(root).find((f) => f.endsWith(join("arrivals.ts")))!;
    const text = readFileSync(file, "utf8");
    const tables = [...text.matchAll(/const (?:SELECTORS|FLYING)\b[^=]*=\s*([\s\S]*?);\n/g)].map(
      (m) => m[1],
    );
    expect(tables.length).toBe(2);
    const selectors = tables.flatMap((t) =>
      [...t.matchAll(/(["'`])((?:(?!\1).)*)\1/g)].map((m) => m[2]),
    );
    expect(selectors.filter(namesClass)).toEqual([]);
  });
});

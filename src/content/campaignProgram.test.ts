import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ContentCoverage } from "./schema";

const coverage = ContentCoverage.parse(JSON.parse(readFileSync("content/coverage.json", "utf8")));
const program = readFileSync("docs/campaign-program.md", "utf8");
const rows = [...program.matchAll(/^\| \[[ x]\] \| `([^`]+)` \|/gm)].map((m) => m[1]);

describe("docs/campaign-program.md", () => {
  it("lists every pack with cards that don't work once", () => {
    const left = Object.entries(coverage.packs).filter(([, p]) => p.encounter.works < p.encounter.total || p.player.works < p.player.total).map(([pack]) => pack);
    expect(left.filter((p) => !rows.includes(p)), "packs with work left missing from the program").toEqual([]);
    expect(rows.filter((p, k) => rows.indexOf(p) !== k), "packs listed twice").toEqual([]);
  });

  it("names a pack that exists in every row", () => {
    expect(rows.filter((p) => !coverage.packs[p])).toEqual([]);
  });
});

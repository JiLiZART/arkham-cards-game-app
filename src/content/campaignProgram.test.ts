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

  it("lists every incomplete scenario of a campaign box once, under its pack", () => {
    const boxes = { eoec: "edge-of-the-earth", tskc: "the-scarlet-keys", fhvc: "the-feast-of-hemlock-vale", tdcc: "the-drowned-city", cob: "children-of-blood", fof: "fortune-and-folly", guardians: "guardians-of-the-abyss" };
    const rows = [...program.matchAll(/^\| \[[ x]\] \| scenario `([^`]+)` \|/gm)].map((m) => m[1]);
    const expected = Object.values(boxes).flatMap((campaign) => Object.entries(coverage.scenarios).filter(([, sc]) => sc.campaign === campaign && !sc.complete).map(([id]) => id));
    expect(expected.length).toBeGreaterThan(40);
    expect(expected.filter((id) => !rows.includes(id)), "scenarios missing from the program").toEqual([]);
    expect(rows.filter((id, k) => rows.indexOf(id) !== k), "scenarios listed twice").toEqual([]);
    expect(rows.filter((id) => !coverage.scenarios[id]), "rows naming no scenario").toEqual([]);
  });

  it("names a pack that exists in every row", () => {
    expect(rows.filter((p) => !coverage.packs[p])).toEqual([]);
  });
});

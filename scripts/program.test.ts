import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** the campaign program's changes: campaigns, player cards, the importers, the shared and cycle engine pieces, the languages */
const PROGRAM =
  /^(campaign-|player-cards-|scenario-import-fixes$|i18n-all-locales$|engine-(scenario-structure|generic-keywords|location-instances-grid|bless-curse)$|engine-(tfa|tcu|tde|tic|eoe|tsk|fhv|tdc)-)/;

/** archived changes named like the program's that predate it */
const EARLIER = new Set(["campaign-coverage", "campaign-guide-flow", "campaign-music"]);

const dirs = (path: string) =>
  existsSync(path)
    ? readdirSync(path, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
const changes = [
  ...dirs("openspec/changes").filter((c) => c !== "archive"),
  ...dirs("openspec/changes/archive").map((c) => c.replace(/^\d{4}-\d{2}-\d{2}-/, "")),
].filter((c) => PROGRAM.test(c) && !EARLIER.has(c));
const listed = [
  ...readFileSync("docs/campaign-program.md", "utf8").matchAll(/^\| `([a-z0-9-]+)` \| /gm),
].map((m) => m[1]);

describe("docs/campaign-program.md: the changes table", () => {
  it("lists every program change once", () => {
    expect(
      changes.filter((c) => !listed.includes(c)),
      "changes missing from the table",
    ).toEqual([]);
    expect(
      listed.filter((c, k) => listed.indexOf(c) !== k),
      "changes listed twice",
    ).toEqual([]);
  });

  it("lists only changes that exist", () => {
    expect(listed.filter((c) => !changes.includes(c))).toEqual([]);
  });
});

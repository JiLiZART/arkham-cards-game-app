/**
 * Every count and card list a Dunwich Legacy script writes for the campaign (`flags.countEntry` / `flags.cardsEntry`,
 * recorded as `count:<section>:<id>` / `cards:<section>:<id>`) is read again: by a condition or effect of the flow, or by
 * a later scenario's script from the log (`log.<id>`). A note nobody reads would be silent (campaign-the-dunwich-legacy
 * design, risks). The scripts name their notes as `const NAME = ["<section>", "<id>"]`. Return to The Dunwich Legacy's
 * scripts compose the base's, so its flow is checked against both sets of scripts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BASE = ["content/campaigns/the-dunwich-legacy/scripts", "content/packs/dwl/scripts"];
const CAMPAIGNS = {
  "the-dunwich-legacy": BASE,
  "return-to-the-dunwich-legacy": [
    ...BASE,
    "content/campaigns/return-to-the-dunwich-legacy/scripts",
    "content/packs/return/scripts",
  ],
};
const sourcesOf = (dirs: string[]) =>
  dirs.flatMap((d) =>
    readdirSync(d)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => readFileSync(join(d, f), "utf8")),
  );

/** `<section>:<id>` of every note a script writes */
function written(sources: string[]): string[] {
  const out: string[] = [];
  for (const src of sources)
    for (const m of src.matchAll(/(?:countEntry|cardsEntry)\.set\(\s*game,\s*([\w[\]", ]+?),/g)) {
      const arg = m[1].trim();
      const literal = /^\[\s*"([^"]+)",\s*"([^"]+)"\s*\]$/.exec(arg);
      const named = new RegExp(`const ${arg} = \\[\\s*"([^"]+)",\\s*"([^"]+)"\\s*\\]`).exec(src);
      const pair = literal ?? named;
      if (!pair) throw new Error(`a note key the check cannot read: ${arg}`);
      out.push(`${pair[1]}:${pair[2]}`);
    }
  return out;
}

/** `<section>:<id>` of every log id the flow's conditions and effects name (the section defaults to the notes) */
function flowNames(campaign: string): Set<string> {
  const names = new Set<string>();
  const walk = (o: unknown) => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") {
      const r = o as Record<string, unknown>;
      const kind = String(r.kind ?? r.do ?? "");
      if (typeof r.id === "string" && /^log|Listed$|^listCards$/.test(kind))
        names.add(`${typeof r.section === "string" ? r.section : "campaign_notes"}:${r.id}`);
      Object.values(r).forEach(walk);
    }
  };
  walk(JSON.parse(readFileSync(`content/campaigns/${campaign}/flow.json`, "utf8")));
  return names;
}

describe.each(Object.entries(CAMPAIGNS))("%s's campaign notes", (campaign, dirs) => {
  it("every count and card list a script writes is read by the flow or a later scenario", () => {
    const sources = sourcesOf(dirs);
    const notes = written(sources);
    expect(notes.length).toBeGreaterThan(0);
    const flow = flowNames(campaign);
    const readByScripts = (id: string) =>
      sources.some((src) => new RegExp(`\\blog\\.${id}\\b|\\blog\\["${id}"\\]`).test(src));
    for (const n of notes) {
      const id = n.split(":")[1];
      expect(flow.has(n) || readByScripts(id), n).toBe(true);
    }
  });
});

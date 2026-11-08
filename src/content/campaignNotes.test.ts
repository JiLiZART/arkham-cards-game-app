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

/**
 * The Path to Carcosa's scripts (campaign-the-path-to-carcosa task 10.1): every count, card list and hidden entry they
 * write (`count:`, `cards:`, `log:hidden:`) is one a flow condition or effect reads. Return to The Path to Carcosa's
 * scripts compose the base's and its flow is the base's under the Return ids (campaign-return-to-the-path-to-carcosa
 * task 11.1), so its flow is checked against both sets of scripts: the Return scenario scripts and the box's cards
 * (520xx). A key built from a variable (`[which, which]`) takes each string the variable is declared with.
 */
const CARCOSA = ["content/campaigns/the-path-to-carcosa/scripts", "content/packs/ptc/scripts"];
const RTPTC_CARDS = readdirSync("content/packs/return/scripts")
  .filter((f) => /^520\d\d\w*\.ts$/.test(f))
  .map((f) => readFileSync(join("content/packs/return/scripts", f), "utf8"));
const CARCOSA_CAMPAIGNS = {
  "the-path-to-carcosa": sourcesOf(CARCOSA),
  "return-to-the-path-to-carcosa": [
    ...sourcesOf([...CARCOSA, "content/campaigns/return-to-the-path-to-carcosa/scripts"]),
    ...RTPTC_CARDS,
  ],
};

describe.each(Object.entries(CARCOSA_CAMPAIGNS))("%s's campaign notes", (campaign, sources) => {
  function writtenByCarcosa(): string[] {
    const out: string[] = [];
    for (const src of sources)
      for (const m of src.matchAll(
        /(countEntry|cardsEntry|logEntry)\.set\(\s*game,\s*(\[[^\]]*\]|\w+),/g,
      )) {
        const [kind, arg] = [m[1], m[2].trim()];
        const def = new RegExp(`const ${arg} = (\\[[^\\]]*\\])`).exec(src)?.[1] ?? arg;
        const parts = /^\[\s*([^,\s]+),\s*([^\]\s]+)\s*\]$/.exec(def);
        if (!parts) throw new Error(`a note key the check cannot read: ${arg}`);
        const values = (p: string) => {
          // "" is the notes' own section (Archaic Glyphs: "you have translated the glyphs")
          const literal = /^"([^"]*)"$/.exec(p);
          if (literal) return [literal[1]];
          const decl = new RegExp(`\\b${p}\\b\\s*[:=]([^;\\n{]*)`).exec(src)?.[1] ?? "";
          const strings = [...decl.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
          if (!strings.length) throw new Error(`a note key the check cannot read: ${p}`);
          return strings;
        };
        // a plain log entry is shown in the log; only the hidden ones need a reader
        const sections = values(parts[1]).filter((s) => kind !== "logEntry" || s === "hidden");
        if (!sections.length) continue;
        out.push(
          ...(parts[1] === parts[2]
            ? sections.map((s) => `${s}:${s}`)
            : sections.flatMap((s) => values(parts[2]).map((i) => `${s}:${i}`))),
        );
      }
    return out;
  }

  /** `<section>:<id>` of every log id a flow's conditions and effects read */
  function readByFlow(file: string): Set<string> {
    const names = new Set<string>();
    const add = (r: Record<string, unknown>) => {
      if (typeof r.id === "string")
        names.add(`${typeof r.section === "string" ? r.section : "campaign_notes"}:${r.id}`);
    };
    const walk = (o: unknown) => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        const r = o as Record<string, unknown>;
        if (typeof r.kind === "string" && r.kind.startsWith("log")) {
          add(r);
          for (const side of [r.a, r.b])
            if (side && typeof side === "object") add(side as Record<string, unknown>);
        }
        if (r.fromCount && typeof r.fromCount === "object")
          add(r.fromCount as Record<string, unknown>);
        Object.values(r).forEach(walk);
      }
    };
    walk(JSON.parse(readFileSync(file, "utf8")));
    return names;
  }

  it("every count, card list and hidden entry a script writes is read by the flow", () => {
    const notes = writtenByCarcosa();
    expect(notes).toEqual(
      expect.arrayContaining([
        "hidden:tlkCluesOnAct",
        "conviction:conviction",
        "doubt:doubt",
        "campaign_notes:possessed",
      ]),
    );
    const read = readByFlow(`content/campaigns/${campaign}/flow.json`);
    for (const n of notes) expect(read.has(n), n).toBe(true);
  });
});

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

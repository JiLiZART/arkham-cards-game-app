/**
 * Generate every official campaign's definitions from ArkhamCards' campaign guides (ADR-0007):
 * content/campaigns-generated/<id>/campaign.json and scenarios/<id>.json, marked "generated". A campaign with a
 * hand-written folder of the same id in content/campaigns is skipped. The mapping itself is in campaignGuide.ts.
 *   npm run import:campaigns
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CampaignDef,
  ChaosToken,
  Difficulty,
  Resolution,
  ScenarioDef,
  SetupStep,
  SymbolToken,
  TokenEffect,
} from "../src/content/schema";
import { compileFlow } from "./campaignFlow";
import {
  actsAndAgendas,
  chaosBag,
  codesByName,
  isOfficial,
  kebab,
  layoutOf,
  introLead,
  prologueOf,
  resolutionEffects,
  tokenEffects,
  type Raw,
} from "./campaignGuide";
import { readSnapshot, SNAPSHOT } from "./import-cards";

const GUIDES = "inspired/ArkhamCards/assets/generated/all_campaigns.txt";
/** generated campaigns live apart from the hand-written ones (content/campaigns): the browser loads their scenarios on demand */
const OUT = "content/campaigns-generated";
const HAND = "content/campaigns";
/** the English log labels, loaded with the campaign like every locale's campaign text */
const EN_TEXT = "content/i18n/en/campaign-texts";
const DIFFICULTIES: Difficulty[] = ["easy", "standard", "hard", "expert"];
/** the bags a side scenario uses when its guide names none: the core set's */
const CORE_BAGS = JSON.parse(readFileSync(join(HAND, "night-of-the-zealot/campaign.json"), "utf8"))
  .chaosBags as Record<Difficulty, ChaosToken[]>;
/** the token tables of the hand-written scenarios, by reference card */
const HAND_TOKENS = new Map<string, ScenarioDef["tokens"]>(
  readdirSync(HAND).flatMap((c) =>
    existsSync(join(HAND, c, "scenarios"))
      ? readdirSync(join(HAND, c, "scenarios")).map((f) => {
          const s = JSON.parse(readFileSync(join(HAND, c, "scenarios", f), "utf8")) as ScenarioDef;
          return [s.card, s.tokens] as const;
        })
      : [],
  ),
);

interface Card {
  code: string;
  name: string;
  type: string;
  stage?: number;
  set?: string;
  pack: string;
  text?: string;
  backText?: string;
}

const report: string[] = [];
const note = (s: string) => report.push(s);

/** the campaign's difficulty choices, with their tokens */
function bagsOf(campaign: Raw): Partial<Record<Difficulty, ChaosToken[]>> | null {
  for (const st of campaign.steps ?? []) {
    const choices = st.input?.type === "choose_one" ? st.input.choices : null;
    if (!choices?.some((c: Raw) => Array.isArray(c.tokens))) continue;
    const out: Partial<Record<Difficulty, ChaosToken[]>> = {};
    for (const c of choices) {
      if (!DIFFICULTIES.includes(c.id) || !c.tokens) continue;
      const { bag, dropped } = chaosBag(c.tokens);
      out[c.id as Difficulty] = bag;
      if (dropped.length) note(`${campaign.id}: ${c.id} bag without ${dropped.join(", ")}`);
    }
    return out;
  }
  return null;
}

/** the steps a scenario's setup runs: ids expanded; a branch, a condition or a choice takes its first option */
function setupSteps(ids: string[], steps: Record<string, Raw>, seen = new Set<string>()): Raw[] {
  const out: Raw[] = [];
  for (const id of ids) {
    if (id.startsWith("$") || seen.has(id) || !steps[id]) continue;
    seen.add(id);
    const st = steps[id];
    if (st.type !== "branch") out.push(st);
    const first =
      st.condition?.options?.[0] ??
      st.condition?.defaultOption ??
      st.options?.[0] ??
      (st.input?.choices ? st.input.choices[0] : null);
    if (first?.steps) out.push(...setupSteps(first.steps, steps, seen));
  }
  return out;
}

const sentences = (texts: string[]) =>
  texts.flatMap((t) => t.replace(/<[^>]+>/g, "").split(/(?<=[.!])\s+/));
const plain = (t: string) => t.replace(/<\/?(b|i|u|em|strong)>/g, "").trim();

function scenarioOf(
  s: Raw,
  campaignId: string,
  cards: Map<string, Card>,
  bySet: Map<string, Card[]>,
  labels: Record<string, string>,
): ScenarioDef | null {
  const steps: Record<string, Raw> = Object.fromEntries(
    (s.steps ?? []).map((st: Raw) => [st.id, st]),
  );
  const run = setupSteps(s.setup ?? [], steps);
  const where = `${campaignId}/${s.id}`;
  const gather = (st: Raw) => st.type === "encounter_sets" && !/set_aside/.test(st.id);
  // a setup reached only through an input the walk doesn't take: the guide's first set list
  const setSteps = run.some(gather)
    ? run.filter(gather)
    : (s.steps ?? []).filter(gather).slice(0, 1);
  const guideSets: string[] = setSteps.flatMap((st: Raw) => st.encounter_sets);
  const sets = guideSets.filter((x) => bySet.has(x));
  const unknown = guideSets.filter((x) => !bySet.has(x));
  if (unknown.length) note(`${where}: encounter sets not in the snapshot: ${unknown.join(", ")}`);
  const ref = cards.get(s.chaos_bag_card);
  if (!ref || !sets.length) {
    note(`${where}: skipped (${!ref ? "no reference card" : "no known encounter set"})`);
    return null;
  }
  const own = sets.includes(s.id) ? s.id : sets[0];
  // a Return-to or a multi-part scenario keeps its acts and agendas in another of its sets: the first set that has some
  const deck = (kind: "acts" | "agendas") =>
    [own, ...sets].map((x) => actsAndAgendas(bySet.get(x)!, x)[kind]).find((l) => l.length) ?? [];
  const acts = deck("acts");
  const agendas = deck("agendas");
  const pool = sets.flatMap((x) => bySet.get(x)!);
  const locations = pool.filter((c) => c.type === "location");
  const texts = sentences(
    run.map((st) => st.text).filter((t): t is string => typeof t === "string"),
  );
  const story = new Set(["act", "agenda", "location", "scenario"]);
  const setAside = [
    ...new Set(
      texts
        .filter((t) => /aside/i.test(t))
        .flatMap((t) =>
          codesByName(
            t,
            pool.filter((c) => !story.has(c.type) || c.type === "location"),
          ),
        ),
    ),
  ];
  const grid = run.find((st) => st.type === "location_setup");
  let inPlay: string[];
  let layout: Record<string, [number, number]> = {};
  let connections: [string, string][] = [];
  if (grid) {
    const g = layoutOf(grid.locations);
    layout = g.layout;
    connections = g.connections;
    inPlay = g.codes.filter((c) => cards.get(c)?.type === "location" && !setAside.includes(c));
  } else {
    inPlay = [
      ...new Set(
        texts
          .filter((t) => /into play/i.test(t) && !/aside/i.test(t))
          .flatMap((t) => codesByName(t, locations)),
      ),
    ].filter((c) => !setAside.includes(c));
  }
  if (!inPlay.length) {
    // ponytail: nothing named; the scenario set's first location keeps the scenario playable
    const first = locations.find((c) => c.set === own && !setAside.includes(c.code));
    if (first) inPlay = [first.code];
    note(`${where}: no locations found in the setup text, starting with ${first?.name ?? "none"}`);
  }
  if (!inPlay.length || !acts.length || !agendas.length) {
    note(
      `${where}: skipped (${!inPlay.length ? "no location" : !acts.length ? "no act" : "no agenda"})`,
    );
    return null;
  }
  // locations without a place on the grid: a row below it, connected to every location (no source has the symbols)
  const loose = [
    ...new Set([...inPlay, ...setAside.filter((c) => cards.get(c)?.type === "location")]),
  ].filter((c) => !layout[c]);
  const bottom = Object.values(layout).reduce((m, [, r]) => Math.max(m, r + 1), 0);
  loose.forEach((c, k) => (layout[c] = [k, bottom]));
  const placed = Object.keys(layout);
  for (const c of loose)
    for (const o of placed)
      if (o !== c && !connections.some(([a, b]) => (a === c && b === o) || (a === o && b === c)))
        connections.push([c, o]);
  const startText = texts.find((t) => /begins? (play|the game) (at|in)/i.test(t));
  const start =
    (startText &&
      codesByName(
        startText.replace(/^.*?begins? (play|the game) (at|in)/i, ""),
        locations.filter((c) => inPlay.includes(c.code)),
      )[0]) ||
    inPlay[0];
  const setup: SetupStep[] = [{ do: "putIntoPlay", codes: inPlay }];
  if (setAside.length) setup.push({ do: "setAside", codes: setAside });
  setup.push({ do: "startAt", code: start });
  // chaos tokens: a hand-written scenario's tables when it plays with the same reference card (a Return-to scenario);
  // otherwise the reference card's front for easy/standard, its back for hard/expert
  const tokens: ScenarioDef["tokens"] = { ...HAND_TOKENS.get(ref.code) };
  if (!HAND_TOKENS.has(ref.code))
    for (const [side, diffs] of [
      [ref.text, ["easy", "standard"]],
      [ref.backText ?? ref.text, ["hard", "expert"]],
    ] as const) {
      const t = tokenEffects(side);
      if (t.approximated.length)
        note(`${where}: ${diffs.join("/")} ${t.approximated.join(", ")} read as -2`);
      for (const d of diffs) tokens[d] = t.effects as Record<SymbolToken, TokenEffect>;
    }
  const resolutions: Record<string, Resolution> = {};
  for (const r of s.resolutions ?? []) {
    const key = r.id === "no_resolution" ? "none" : /^R\d+$/.test(r.id) ? r.id : null;
    if (!key) continue;
    const { effects, labels: l } = resolutionEffects(r.steps ?? [], steps);
    Object.assign(labels, l);
    resolutions[key] = {
      title: r.title ?? key,
      text: plain(r.text ?? r.description ?? ""),
      effects,
    };
  }
  resolutions.none ??= {
    title: "No resolution was reached",
    text: "",
    effects: [{ do: "xp", victory: true, bonus: 0, who: "each" }],
  };
  const intro = run.find((st) => st.type === "story" && st.text)?.text;
  // cards the setup names from sets the scenario doesn't gather: their sets join as a hidden side deck, so the setup can
  // take them without their other cards entering the encounter deck
  const outside = [
    ...new Set(
      [...inPlay, ...setAside]
        .map((c) => cards.get(c)?.set)
        .filter((x): x is string => !!x && !sets.includes(x)),
    ),
  ].sort();
  const missing = [...inPlay, ...setAside, ...acts, ...agendas].filter((c) => !cards.has(c));
  if (missing.length) note(`${where}: unknown codes ${missing.join(", ")}`);
  return {
    id: "",
    name: s.scenario_name,
    card: ref.code,
    ...(intro ? { intro: plain(intro) } : {}),
    encounterSets: sets,
    sideDecks: outside.length ? { _setAside: outside } : {},
    acts,
    agendas,
    setup,
    tokens,
    resolutions,
    i18nId: s.id,
    connections,
    oneWay: [],
    layout,
  };
}

/** the packs a scenario's cards come from */
function packsOf(s: ScenarioDef, cards: Map<string, Card>, bySet: Map<string, Card[]>): string[] {
  const codes = [
    s.card,
    ...s.acts,
    ...s.agendas,
    ...s.setup.flatMap((st) => ("codes" in st ? st.codes : "code" in st ? [st.code] : [])),
    ...s.encounterSets.flatMap((x) => bySet.get(x)!.map((c) => c.code)),
  ];
  return [...new Set(codes.map((c) => cards.get(c)?.pack).filter((p): p is string => !!p))];
}

const write = (file: string, v: unknown) => {
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(v, null, 2) + "\n");
};

/** a campaign written by hand (content/campaigns/<id>) replaces the generated one */
const handWritten = (id: string) => existsSync(join(HAND, id, "campaign.json"));

export function main() {
  const guides: Raw[] = JSON.parse(readFileSync(GUIDES, "utf8"));
  const cards = new Map<string, Card>();
  for (const [pack, raws] of readSnapshot(SNAPSHOT))
    for (const r of raws)
      cards.set(r.code, {
        code: r.code,
        name: r.name,
        type: r.type_code,
        stage: r.stage,
        set: r.encounter_code,
        pack,
        text: r.text,
        backText: r.back_text,
      });
  const bySet = new Map<string, Card[]>();
  for (const c of cards.values()) if (c.set) bySet.set(c.set, [...(bySet.get(c.set) ?? []), c]);
  // earlier generated folders go; a rerun writes exactly what the guides give now
  rmSync(OUT, { recursive: true, force: true });
  rmSync(EN_TEXT, { recursive: true, force: true });
  const used = new Set<string>();
  const handIds = new Set<string>();
  for (const g of guides) if (g.campaign.id === "core") handIds.add("core");
  const written: string[] = [];
  for (const g of guides) {
    const c = g.campaign;
    if (!isOfficial(c.id) || handIds.has(c.id)) {
      if (!isOfficial(c.id)) note(`${c.id} (${c.name}): fan-made, skipped`);
      continue;
    }
    const bags = bagsOf(c) ?? CORE_BAGS;
    const byId = new Map<string, Raw>(g.scenarios.map((s: Raw) => [s.id, s]));
    const ordered: Raw[] = [
      ...(c.scenarios ?? []).map((id: string) => byId.get(id)).filter(Boolean),
      ...g.scenarios.filter((s: Raw) => !(c.scenarios ?? []).includes(s.id)),
    ];
    const playable = ordered.filter((s) => s.chaos_bag_card);
    // the side scenarios are each a campaign of their own
    const groups: { id: string; name: string; i18nId: string; scenarios: Raw[] }[] =
      c.id === "side"
        ? playable.map((s) => ({
            id: `side-${kebab(s.id)}`,
            name: s.scenario_name,
            i18nId: c.id,
            scenarios: [s],
          }))
        : [
            {
              id: kebab(
                c.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_|_$/g, ""),
              ),
              name: c.name,
              i18nId: c.id,
              scenarios: playable,
            },
          ];
    for (const grp of groups) {
      if (handWritten(grp.id)) continue;
      const labels: Record<string, string> = {};
      const defs: ScenarioDef[] = [];
      /** guide scenario id → the file's id, for the flow */
      const ids = new Map<string, string>();
      for (const s of grp.scenarios) {
        // a side scenario already generated as a standalone of its own (Fortune and Folly) is not repeated
        if (c.id === "side" && used.has(kebab(s.id))) continue;
        const def = scenarioOf(s, grp.id, cards, bySet, labels);
        if (!def) continue;
        let id = kebab(s.id);
        if (used.has(id)) id = `${grp.id}-${id}`;
        used.add(id);
        ids.set(s.id, id);
        defs.push({ ...def, id });
      }
      if (!defs.length) {
        note(`${grp.id}: no playable scenario, skipped`);
        continue;
      }
      rmSync(join(OUT, grp.id), { recursive: true, force: true });
      for (const d of defs) write(join(OUT, grp.id, "scenarios", `${d.id}.json`), d);
      // what happens between the scenarios: the campaign guide's flow (a side scenario has no campaign setup of its own)
      const { flow, unsupported, logLabels } = compileFlow({
        campaign: c.id === "side" ? { ...c, setup: [] } : c,
        scenarios: g.scenarios,
        ids,
      });
      Object.assign(labels, logLabels);
      for (const [kind, n] of Object.entries(unsupported).sort())
        note(`${grp.id}: flow ${kind} ×${n}`);
      write(join(OUT, grp.id, "flow.json"), flow);
      const byDef = new Map(defs.map((d) => [d.id, d]));
      const cardList = flow.order.map((id) => {
        const d = byDef.get(id);
        return d
          ? {
              scenario: id,
              name: d.name,
              code: d.card,
              ...(d.agendas[0] ? { agenda: d.agendas[0] } : {}),
              ...(d.acts[0] ? { act: d.acts[0] } : {}),
            }
          : { scenario: id, name: flow.interludes[id]?.name, interlude: true as const };
      });
      const logSections = [
        { id: "campaign_notes", kind: "entries" as const, label: "Campaign Notes" },
        ...(c.campaign_log ?? [])
          .filter((sec: Raw) => sec.id && sec.id !== "campaign_notes" && !sec.hidden && sec.title)
          .map((sec: Raw) => ({
            id: sec.id as string,
            kind: (sec.type === "count"
              ? "count"
              : sec.type === "investigator_count"
                ? "investigatorCount"
                : "entries") as "count" | "investigatorCount" | "entries",
            label: String(sec.title),
          })),
      ];
      const campaign: CampaignDef = {
        id: grp.id,
        name: grp.name,
        scenarios: defs.map((d) => d.id),
        i18nId: grp.i18nId,
        chaosBags: bags as CampaignDef["chaosBags"],
        logLabels: {},
        packs: [...new Set(["core", ...defs.flatMap((d) => packsOf(d, cards, bySet))])].sort(),
        generated: true,
        card: defs[0].card,
        // the tile's art: the first agenda of the first scenario the players play (the order may open with an interlude)
        ...(() => {
          const first = flow.order.map((id) => byDef.get(id)).find(Boolean) ?? defs[0];
          return first.agendas[0] ? { cover: first.agendas[0] } : {};
        })(),
        // a side scenario has no campaign prologue: its tile shows the scenario's own intro
        ...((c.id === "side" ? introLead(defs[0].intro) : prologueOf(c))
          ? { prologue: c.id === "side" ? introLead(defs[0].intro) : prologueOf(c) }
          : {}),
        scenarioNames: defs.map((d) => d.name),
        logSections,
        cards: cardList,
      };
      write(join(OUT, grp.id, "campaign.json"), campaign);
      mkdirSync(EN_TEXT, { recursive: true });
      writeFileSync(
        join(EN_TEXT, `${grp.id}.json`),
        JSON.stringify({
          campaigns: { [grp.id]: { logLabels: Object.fromEntries(Object.entries(labels).sort()) } },
        }) + "\n",
      );
      written.push(`${grp.id} (${defs.length})`);
    }
  }
  console.log(`campaigns: ${written.length}, scenarios: ${used.size}`);
  console.log(written.join(", "));
  writeFileSync(".cache/import-campaigns.log", report.join("\n") + "\n");
  console.log(`${report.length} notes in .cache/import-campaigns.log`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

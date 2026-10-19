import type { ContentDb } from "../engine/types";
import { implemented } from "./implemented";
import type { CardCount, ContentCoverage } from "./schema";
import type { ContentError } from "./loader";

const count = (db: ContentDb, codes: string[]): CardCount => {
  const rest: Record<string, number> = {};
  let works = 0;
  for (const code of codes) {
    if (implemented(db, code)) works++;
    else rest[db.cards[code].type] = (rest[db.cards[code].type] ?? 0) + 1;
  }
  return { total: codes.length, works, rest: Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b))) };
};

/** per card pack (the deluxe box, each mythos pack, a Return-to box...): its encounter cards and its player cards (weaknesses included), how many of each work */
export function packCoverage(db: ContentDb): ContentCoverage["packs"] {
  const byPack: Record<string, string[]> = {};
  for (const c of Object.values(db.cards)) if (c.type !== "investigator") (byPack[c.pack] ??= []).push(c.code);
  return Object.fromEntries(
    Object.keys(byPack).sort().map((pack) => [pack, {
      encounter: count(db, byPack[pack].filter((c) => db.cards[c].faction === "mythos").sort()),
      player: count(db, byPack[pack].filter((c) => db.cards[c].faction !== "mythos").sort()),
    }]),
  );
}

/** the cards a scenario uses: its encounter sets, side decks, acts, agendas and reference card */
function usedBy(db: ContentDb, s: ContentDb["scenarios"][string]): string[] {
  const used = new Set<string>();
  for (const set of [...s.encounterSets, ...Object.values(s.sideDecks).flat()]) for (const c of db.encounterSets[set] ?? []) used.add(c);
  for (const c of [s.card, ...s.acts, ...s.agendas]) if (db.cards[c]) used.add(c);
  return [...used].sort();
}

/** a scenario: the cards it uses and how many work, whether its tokens are real (its reference card works), whether it has a script */
export function scenarioCoverage(db: ContentDb, id: string): ContentCoverage["scenarios"][string] {
  const s = db.scenarios[id];
  const cards = count(db, usedBy(db, s));
  const tokens = implemented(db, s.card);
  const scripted = !!db.scripts[id];
  return { campaign: Object.values(db.campaigns).find((c) => c.scenarios.includes(id))?.id ?? "", cards, tokens, scripted, complete: cards.works === cards.total && tokens && scripted };
}

/** the cards a campaign's scenarios use, how many work, which scenarios have no script; complete when all its scenarios are */
export function campaignCoverage(db: ContentDb, id: string): ContentCoverage["campaigns"][string] {
  const scenarios = db.campaigns[id].scenarios.flatMap((s) => db.scenarios[s] ?? []);
  const cards = count(db, [...new Set(scenarios.flatMap((s) => usedBy(db, s)))].sort());
  const unscripted = scenarios.filter((s) => !db.scripts[s.id]).map((s) => s.id);
  return { cards, unscripted, complete: scenarios.every((s) => scenarioCoverage(db, s.id).complete) };
}

/** an investigator works when their card and their signature cards do */
export function investigatorCoverage(db: ContentDb): ContentCoverage["investigators"] {
  return Object.fromEntries(
    Object.values(db.investigators)
      .map((i) => [i.code, [i.code, ...i.signatures].every((c) => implemented(db, c))] as const)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function contentCoverage(db: ContentDb): ContentCoverage {
  return {
    packs: packCoverage(db),
    campaigns: Object.fromEntries(Object.keys(db.campaigns).sort().map((id) => [id, campaignCoverage(db, id)])),
    scenarios: Object.fromEntries(Object.keys(db.scenarios).sort().map((id) => [id, scenarioCoverage(db, id)])),
    investigators: investigatorCoverage(db),
  };
}

/** the committed file's text: sorted, so a rerun on unchanged content is identical */
export const coverageJson = (db: ContentDb) => JSON.stringify(contentCoverage(db), null, 1) + "\n";

/** content/coverage.json must be what the content gives (the README credits work the same way) */
export function checkCoverage(db: ContentDb): ContentError[] {
  if (db.coverage && JSON.stringify(db.coverage) === JSON.stringify(contentCoverage(db))) return [];
  return [{ file: "content/coverage.json", path: "", message: "content/coverage.json is behind the content (npm run coverage)" }];
}

/** a campaign's chapters (`cards`) must agree with its scenarios: reference card, first agenda, first act */
export function checkCampaignCards(db: ContentDb): ContentError[] {
  const errors: ContentError[] = [];
  for (const c of Object.values(db.campaigns)) {
    c.cards.forEach((ch, k) => {
      const s = ch.interlude ? undefined : db.scenarios[ch.scenario];
      if (!s) return;
      for (const [field, want] of [["code", s.card], ["agenda", s.agendas[0]], ["act", s.acts[0]]] as const)
        if (ch[field] !== want) errors.push({ file: `campaigns/${c.id}/campaign.json`, path: `cards.${k}.${field}`, message: `${ch[field]} but ${ch.scenario} has ${want}` });
    });
  }
  return errors;
}

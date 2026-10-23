/**
 * Pure mapping from ArkhamCards' campaign guides (inspired/ArkhamCards/assets/generated/all_campaigns.txt) to the
 * game's campaign and scenario definitions. import-campaigns.ts does the reading and writing; ADR-0007 says why.
 */
import type { CampaignEffect, ChaosToken, SymbolToken } from "../src/content/schema";

export type Raw = any;

const TOKEN: Record<string, ChaosToken> = {
  skull: "skull",
  cultist: "cultist",
  tablet: "tablet",
  elder_thing: "elderThing",
  auto_fail: "autoFail",
  elder_sign: "elderSign",
};
const NUMBER = /^([+-]?\d+)$/;

/** a guide token as the engine's token, or null for the ones it doesn't know (frost, blood, bless, curse) */
export function tokenName(t: string): ChaosToken | null {
  if (TOKEN[t]) return TOKEN[t];
  const m = NUMBER.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? "+1" : n < -8 ? "-8" : (String(n) as ChaosToken);
}

export function chaosBag(tokens: string[]): { bag: ChaosToken[]; dropped: string[] } {
  const bag: ChaosToken[] = [];
  const dropped = new Set<string>();
  for (const t of tokens) {
    const n = tokenName(t);
    if (n) bag.push(n);
    else dropped.add(t);
  }
  return { bag, dropped: [...dropped] };
}

const CODE = /^(\d{5}[a-z]?)(?:_back)?$/;

/** the guide's location grid: each code's [column, row], connections between orthogonal neighbours, codes in reading order */
export function layoutOf(grid: string[][]): {
  layout: Record<string, [number, number]>;
  connections: [string, string][];
  codes: string[];
} {
  const at = grid.map((row) => row.map((e) => CODE.exec(String(e))?.[1] ?? null));
  const layout: Record<string, [number, number]> = {};
  const codes: string[] = [];
  const connections: [string, string][] = [];
  at.forEach((row, r) =>
    row.forEach((code, c) => {
      if (!code || layout[code]) return;
      layout[code] = [c, r];
      codes.push(code);
    }),
  );
  // ponytail: neighbours on the grid stand in for the printed connection symbols, which no source has as data
  at.forEach((row, r) =>
    row.forEach((code, c) => {
      if (!code) return;
      const below = at[r + 1]?.[c];
      const right = row[c + 1];
      if (right && right !== code) connections.push([code, right]);
      if (below && below !== code) connections.push([code, below]);
    }),
  );
  // reading order: row by row, so the pair list reads top to bottom
  connections.sort(
    (a, b) => layout[a[0]][1] - layout[b[0]][1] || layout[a[0]][0] - layout[b[0]][0],
  );
  return { layout, connections, codes };
}

const quotes = (s: string) => s.replace(/[“”«»„]/g, '"').replace(/[‘’]/g, "'");

/** codes of the pool's cards whose names appear in the text, in order of appearance; longer names win over names inside them */
export function codesByName(text: string, pool: { code: string; name: string }[]): string[] {
  let rest = quotes(text);
  const hits: { at: number; codes: string[] }[] = [];
  const byName = new Map<string, string[]>();
  for (const p of pool) byName.set(quotes(p.name), [...(byName.get(quotes(p.name)) ?? []), p.code]);
  for (const name of [...byName.keys()].sort((a, b) => b.length - a.length)) {
    let i = rest.indexOf(name);
    while (i >= 0) {
      hits.push({ at: i, codes: byName.get(name)! });
      rest = rest.slice(0, i) + "\u0000".repeat(name.length) + rest.slice(i + name.length);
      i = rest.indexOf(name);
    }
  }
  return [...new Set(hits.sort((a, b) => a.at - b.at).flatMap((h) => h.codes))];
}

const SYMBOL: Record<string, SymbolToken> = {
  skull: "skull",
  cultist: "cultist",
  tablet: "tablet",
  elder_thing: "elderThing",
};

/** each symbol's modifier from one side of a scenario reference card; "-X" and anything unreadable become -2 */
export function tokenEffects(text: string | undefined): {
  effects: Partial<Record<SymbolToken, { modifier: number }>>;
  approximated: SymbolToken[];
} {
  const effects: Partial<Record<SymbolToken, { modifier: number }>> = {};
  const approximated: SymbolToken[] = [];
  for (const line of (text ?? "").split("\n")) {
    const m = /^((?:\[\w+\]\s*)+):\s*([^.]*)/.exec(line.trim());
    if (!m) continue;
    const symbols = [...m[1].matchAll(/\[(\w+)\]/g)].map((s) => SYMBOL[s[1]]).filter(Boolean);
    const n = /^([+-−–]?\d+)/.exec(m[2].trim());
    // ponytail: only the modifier is read; the token's extra effect is text the engine doesn't run
    const modifier = n ? Number(n[1].replace(/[−–]/, "-")) : -2;
    for (const s of symbols) {
      effects[s] = { modifier };
      if (!n && !approximated.includes(s)) approximated.push(s);
    }
  }
  return { effects, approximated };
}

/** the acts and agendas of a set, in stage order, one card per stage (the lowest code of a stage's versions) */
export function actsAndAgendas(
  cards: { code: string; type: string; stage?: number; set?: string }[],
  set: string,
): { acts: string[]; agendas: string[] } {
  const pick = (type: string) => {
    const byStage = new Map<number, string>();
    for (const c of cards
      .filter((c) => c.type === type && c.set === set)
      .sort((a, b) => (a.code < b.code ? -1 : 1))) {
      const stage = c.stage ?? 0;
      if (!byStage.has(stage)) byStage.set(stage, c.code);
    }
    return [...byStage.entries()].sort((a, b) => a[0] - b[0]).map(([, code]) => code);
  };
  return { acts: pick("act"), agendas: pick("agenda") };
}

/** what a resolution's steps do to the campaign, and the log labels of what they record */
export function resolutionEffects(
  stepIds: string[],
  steps: Record<string, Raw>,
): { effects: CampaignEffect[]; labels: Record<string, string> } {
  const effects: CampaignEffect[] = [];
  const labels: Record<string, string> = {};
  let xp = false;
  for (const id of stepIds) {
    const st = steps[id];
    if (!st) continue;
    const all = [
      ...(st.effects ?? []),
      ...(st.input && typeof st.input === "object" ? (st.input.effects ?? []) : []),
    ];
    for (const e of all) {
      switch (e.type) {
        case "campaign_log":
          if (!e.id) break;
          effects.push({ do: "record", key: e.id, value: true });
          if (e.text) labels[e.id] = e.text;
          break;
        case "add_card":
          if (e.card)
            effects.push({
              do: "earnCard",
              code: e.card,
              who: e.investigator === "lead_investigator" ? "lead" : "choice",
            });
          break;
        case "add_chaos_token":
          for (const t of e.tokens ?? []) {
            const n = tokenName(t);
            if (n) effects.push({ do: "addChaosToken", token: n });
          }
          break;
        case "earn_xp":
          xp = true;
          effects.push({ do: "xp", victory: true, bonus: e.bonus ?? 0, who: "each" });
          break;
        case "trauma":
          effects.push({
            do: "trauma",
            who: e.investigator === "lead_investigator" ? "lead" : "each",
            physical: e.physical ?? 0,
            mental: e.mental ?? 0,
          });
          break;
        case "add_weakness":
          if (e.weakness_traits?.[0])
            effects.push({ do: "addWeakness", trait: e.weakness_traits[0] });
          break;
        case "remove_card":
          if (e.card) effects.push({ do: "removeCard", code: e.card });
          break;
      }
    }
  }
  if (!xp) effects.push({ do: "xp", victory: true, bonus: 0, who: "each" });
  return { effects, labels };
}

/** a campaign's opening text for its tile: the first story step of its setup (an epigraph for most), markup removed */
export function prologueOf(campaign: Raw): string | undefined {
  const steps: Record<string, Raw> = Object.fromEntries(
    (campaign.steps ?? []).map((s: Raw) => [s.id, s]),
  );
  for (const id of campaign.setup ?? []) {
    const st = steps[id];
    if (st?.type === "story" && st.text)
      return String(st.text)
        .replace(/<\/?[a-z][^>]*>/gi, "")
        .trim();
  }
  return undefined;
}

/** a side scenario's tile text: the first paragraph of its intro (the whole intro is read in the game), markup removed */
export const introLead = (intro: string | undefined): string | undefined =>
  intro
    ?.replace(/<\/?[a-z][^>]*>/gi, "")
    .split(/\n\s*\n/)[0]
    .trim() || undefined;

/** official campaigns only: the fan-made ones start with z, and the Return to Innsmouth in the guides is unofficial */
export const isOfficial = (id: string) => !id.startsWith("z") && id !== "rttic";

export const kebab = (id: string) => id.replace(/_/g, "-");

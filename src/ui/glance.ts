import type { CardDef } from "../content/schema";

/**
 * One piece of a hand card's glance badge: an icon with an amount where one applies. `icon` is an icon name
 * (a skill, damage, health, sanity, clue, resource) or a sprite symbol (card, weakness); `plus` shows "+n".
 */
export interface Chip {
  icon: string;
  n?: number;
  plus?: true;
}

const MAX_CHIPS = 3;
const SKILLS = ["willpower", "intellect", "combat", "agility", "wild"] as const;
/** ability kinds that are something the card does (not a standing modifier, a forced effect or a revelation) */
const DOES = new Set(["action", "onPlay", "reaction", "fast"]);

/** cards whose behaviour lives in a script, so the data can't say what they do */
export const GLANCE_OVERRIDES: Record<string, Chip[]> = {
  // Dynamite Blast: 3 damage to each enemy and investigator at a location
  "01024": [
    { icon: "damage", n: 3 },
    { icon: "willpower", n: 1 },
  ],
  // Medical Texts: test intellect, heal 1 damage
  "01035": [
    { icon: "health", n: 1 },
    { icon: "combat", n: 1 },
  ],
};

type Eff = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** the chips one effect gives; gives only, never costs (taking horror, losing resources and the like say nothing) */
function chipsOfEffect(e: Eff): Chip[] {
  const out: Chip[] = [];
  const skill = (fallback: string) => (typeof e.skill === "string" ? e.skill : fallback);
  switch (e.op) {
    case "fight": {
      out.push({ icon: skill("combat") });
      const extra = num(e.damageBonus) + (e.extraDamageIf || e.extraDamageIfSucceedBy ? 1 : 0);
      if (extra) out.push({ icon: "damage", n: extra, plus: true });
      break;
    }
    case "investigate":
      out.push({ icon: skill("intellect") });
      break;
    case "evade":
      out.push({ icon: skill("agility") });
      break;
    case "dealDamage":
      out.push({ icon: "damage", n: num(e.amount) || 1 });
      break;
    case "modify": {
      const mod = e.mod as Eff | undefined;
      if (mod?.stat === "attackDamage") out.push({ icon: "damage", n: num(mod.value), plus: true });
      break;
    }
    case "heal":
      if (num(e.damage)) out.push({ icon: "health", n: num(e.damage) });
      if (num(e.horror)) out.push({ icon: "sanity", n: num(e.horror) });
      break;
    case "discoverClues":
      out.push({ icon: "clue", n: num(e.amount) || 1 });
      break;
    case "drawCards":
      out.push({ icon: "card", n: num(e.amount) || 1 });
      break;
    case "gainResources":
      out.push({ icon: "resource", n: num(e.amount) || 1 });
      break;
  }
  return out;
}

/** every effect under an ability's effects, in reading order (through choices and success / failure branches) */
function walk(effects: unknown, out: Chip[]) {
  if (!Array.isArray(effects)) return;
  for (const e of effects as Eff[]) {
    out.push(...chipsOfEffect(e));
    walk(e.onSuccess, out);
    walk(e.onFail, out);
    for (const o of (Array.isArray(e.options) ? e.options : []) as Eff[]) walk(o.effects, out);
  }
}

const same = (a: Chip, b: Chip) => a.icon === b.icon && a.n === b.n && !!a.plus === !!b.plus;

/**
 * What a card is useful for, at a glance: up to three chips, what its play or ability does first (fight, investigate,
 * evade, damage, healing, clues, cards, resources), then the skill icons it commits merged by skill. A weakness is just
 * the weakness icon; `overrides` (by card code) win over the derivation; a card with nothing to say has no chips.
 */
export function chipsFor(
  card: CardDef,
  overrides: Record<string, Chip[]> = GLANCE_OVERRIDES,
): Chip[] {
  const fixed = overrides[card.code];
  if (fixed) return fixed.slice(0, MAX_CHIPS);
  if (card.subtype === "weakness") return [{ icon: "weakness" }];
  const effects: Chip[] = [];
  for (const a of card.abilities) if (DOES.has(a.kind)) walk(a.effects, effects);
  const unique = effects.filter((c, k) => effects.findIndex((d) => same(c, d)) === k);
  const icons: Chip[] = SKILLS.filter((s) => (card.icons[s] ?? 0) > 0).map((s) => ({
    icon: s,
    n: card.icons[s],
  }));
  return [...unique, ...icons].slice(0, MAX_CHIPS);
}

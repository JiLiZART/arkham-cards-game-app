import { cardText, encounterSetName, t } from "../../content/i18n";
import { connectionsOf } from "../../engine/core";
import type { Slot } from "../../content/schema";
import { playBlock } from "../../engine/rules/cards";
import type { CardInst, ContentDb, GameState, InstId, InvId } from "../../engine/types";
import type { Rect } from "./hover";
import { keywordsOf } from "./glossary";
import type { IconName } from "../assets/icons";

/** one line of the hand card details column */
export type DetailRow =
  | { k: "name"; name: string; subname?: string }
  | { k: "class"; faction: string; label: string }
  | { k: "level"; xp: number; label: string }
  | { k: "cost"; cost: string }
  | { k: "traits"; s: string }
  | { k: "slots"; slots: IconName[] }
  | { k: "icons"; icons: IconName[] }
  | { k: "stats"; health?: number; sanity?: number }
  | { k: "uses"; n: number; label: string }
  // enemies
  | {
      k: "enemy";
      fight: number | string;
      health: number | string;
      perInv: boolean;
      evade: number | string;
      labels: { fight: string; health: string; evade: string; perInv: string };
    }
  | { k: "attack"; damage: number; horror: number; label: string }
  | { k: "wounds"; n: number; label: string }
  | { k: "text"; s: string; dim?: boolean }
  // what committing the hovered hand card to the live test adds, and whether its text applies (commitRow)
  | { k: "commit"; icons: IconName[]; n: number; note: string; textApplies: boolean }
  // locations on the map
  | { k: "shroud"; n: number | string; skill?: IconName; label: string }
  | {
      k: "clues";
      now: number;
      printed: number | null;
      perInv: boolean;
      label: string;
      perInvLabel: string;
    }
  | { k: "victory"; label: string }
  | { k: "connections"; names: string[]; label: string }
  | { k: "here"; invs: InvId[]; enemies: string[]; label: string }
  // the card's keywords, each explained (glossary.ts)
  | { k: "keywords"; label: string; items: { name: string; text: string }[] }
  // why a hand card can't be played right now (Dissonant Voices, a unique copy in play, too few resources)
  | { k: "blocked"; text: string };

/** the "can't play" row for a hand card, or null when nothing but timing stands in its way */
export function blockedRow(
  db: ContentDb,
  game: GameState,
  id: InstId,
  locale: string,
): DetailRow | null {
  const inst = game.cards[id];
  if (!inst || inst.zone !== "hand" || !inst.owner) return null;
  const b = playBlock({ s: game, db, events: [] }, inst.owner, id);
  if (!b) return null;
  const text =
    b.reason === "forbidden"
      ? b.by
        ? t(db, locale, "card.blocked.forbidden", {
            card: cardText(db, game.cards[b.by].code, locale).name,
          })
        : t(db, locale, "card.blocked.forbiddenAny")
      : b.reason === "unique"
        ? t(db, locale, "card.blocked.unique")
        : t(db, locale, "card.blocked.resources", {
            cost: b.cost,
            have: game.invs[inst.owner].resources,
          });
  return { k: "blocked", text };
}

/**
 * In a commit window, what committing this hand card adds: its icons that count for the test's skill (that skill's and
 * wild) and their number, and whether its text applies (only a skill card's does; an asset or event committed for its
 * icons is not played). Null when the card isn't offered for commit. Counts the tested skill printed on the test, not
 * Mind over Matter's stand-in: the engine's option label stays authoritative there.
 */
export function commitRow(
  db: ContentDb,
  game: GameState,
  id: InstId,
  locale: string,
): Extract<DetailRow, { k: "commit" }> | null {
  const test = game.skillTest;
  const offered =
    game.pending?.kind === "commit" &&
    game.pending.options.some((o) => (o.value as { commit?: InstId } | null)?.commit === id);
  const inst = game.cards[id];
  if (!test || !offered || !inst) return null;
  const d = db.cards[inst.code];
  const icons = [
    ...Array<IconName>(d.icons[test.skill] ?? 0).fill(test.skill),
    ...Array<IconName>(d.icons.wild ?? 0).fill("wild"),
  ];
  if (!icons.length) return null;
  const textApplies = d.type === "skill";
  return {
    k: "commit",
    icons,
    n: icons.length,
    textApplies,
    note: t(db, locale, textApplies ? "card.commit.skill" : "card.commit.icons"),
  };
}

/** the glossary row: each keyword the card has, by its name in the locale, with its explanation */
function glossary(db: ContentDb, code: string, locale: string): DetailRow[] {
  const items = keywordsOf(db.cards[code]).map((k) => ({
    name: t(db, locale, `kw.${k}.name`),
    text: t(db, locale, `kw.${k}`),
  }));
  return items.length ? [{ k: "keywords", label: t(db, locale, "card.keywords"), items }] : [];
}

const SLOT_ICONS: Record<Slot, IconName> = {
  hand: "hand",
  arcane: "arcane",
  accessory: "accessory",
  body: "body",
  ally: "ally",
  head: "head",
  tarot: "tarot",
};

/** the slots a card takes, one icon each; two hand or two arcane slots are the printed double icon */
export function slotIcons(slots: readonly Slot[]): { slot: Slot; icon: IconName; n: number }[] {
  return [...new Set(slots)].map((slot) => {
    const n = slots.filter((s) => s === slot).length;
    const icon =
      n === 2 && slot === "hand"
        ? "hands"
        : n === 2 && slot === "arcane"
          ? "arcane2"
          : SLOT_ICONS[slot];
    return { slot, icon, n };
  });
}
const SKILLS = ["willpower", "intellect", "combat", "agility", "wild"] as const;

/** a card as it shows on the map (an unrevealed location goes by its back name) */
const shownName = (db: ContentDb, inst: CardInst, locale: string) => {
  const tx = cardText(db, inst.code, locale);
  return db.cards[inst.code].type === "location" && !inst.revealed
    ? (tx.backName ?? tx.name)
    : tx.name;
};

/** a location on the map: name, traits, shroud, clues, victory, connections, who is there and text; only the back when unrevealed */
function locationDetails(
  db: ContentDb,
  inst: CardInst,
  game: GameState,
  locale: string,
): DetailRow[] {
  const d = db.cards[inst.code];
  const tx = cardText(db, inst.code, locale);
  const invs = game.order.filter((i) => game.invs[i].location === inst.id);
  const enemies = Object.values(game.cards)
    .filter((c) => c.zone === "enemy" && c.location === inst.id)
    .map((c) => shownName(db, c, locale));
  const here: DetailRow[] =
    invs.length || enemies.length
      ? [{ k: "here", invs, enemies, label: t(db, locale, "card.here") }]
      : [];
  if (!inst.revealed) {
    const back = tx.backText ?? "";
    return [
      { k: "name", name: tx.backName ?? tx.name },
      ...here,
      ...(back ? [{ k: "text", s: back } as DetailRow] : []),
    ];
  }
  const rows: DetailRow[] = [{ k: "name", name: tx.name, subname: tx.subname }];
  if (tx.traits?.length) rows.push({ k: "traits", s: tx.traits.map((s) => `${s}.`).join(" ") });
  if (d.shroud !== undefined)
    rows.push({
      k: "shroud",
      n: d.shroud ?? "X",
      skill:
        d.investigateSkill && d.investigateSkill !== "intellect" ? d.investigateSkill : undefined,
      label: t(db, locale, "card.shroud"),
    });
  rows.push({
    k: "clues",
    now: inst.clues,
    printed: d.clues ?? null,
    perInv: !!d.cluesPerInvestigator,
    label: t(db, locale, "card.clues"),
    perInvLabel: t(db, locale, "card.perInvestigator"),
  });
  if (d.victory)
    rows.push({ k: "victory", label: t(db, locale, "card.victory", { n: d.victory }) });
  const names = connectionsOf(db, game, inst.id).map((id) => shownName(db, game.cards[id], locale));
  if (names.length)
    rows.push({ k: "connections", names, label: t(db, locale, "card.connections") });
  rows.push(...here);
  if (tx.text) rows.push({ k: "text", s: tx.text });
  rows.push(...glossary(db, inst.code, locale));
  return rows;
}

/** what a card is, row by row, from its card data (missing fields are skipped), translated; a map location with its instance */
export function cardDetails(
  db: ContentDb,
  code: string,
  locale: string,
  at?: { inst: CardInst; game: GameState },
): DetailRow[] {
  if (at && db.cards[code].type === "location")
    return locationDetails(db, at.inst, at.game, locale);
  const d = db.cards[code];
  const tx = cardText(db, code, locale);
  const rows: DetailRow[] = [{ k: "name", name: tx.name, subname: tx.subname }];
  const type = [
    t(db, locale, `card.type.${d.type}`),
    d.subtype ? t(db, locale, "card.weakness") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  rows.push({
    k: "class",
    faction: d.faction,
    label: `${t(db, locale, `card.faction.${d.faction}`)} · ${type}`,
  });
  if (d.xp !== undefined)
    rows.push({ k: "level", xp: d.xp, label: t(db, locale, "card.level", { n: d.xp }) });
  if (["asset", "event", "skill"].includes(d.type))
    rows.push({ k: "cost", cost: d.cost === undefined || d.cost === null ? "—" : String(d.cost) });
  // encounter cards also name their encounter set (it used to sit under the hover copy)
  const set = d.encounterSet ? encounterSetName(db, d.encounterSet, locale) : null;
  const traits = [tx.traits?.map((s) => `${s}.`).join(" "), set].filter(Boolean).join(" · ");
  if (traits) rows.push({ k: "traits", s: traits });
  const slots = slotIcons(d.slots).map((s) => s.icon);
  if (slots.length) rows.push({ k: "slots", slots });
  const icons = SKILLS.flatMap((s) => Array<IconName>(d.icons[s] ?? 0).fill(s));
  if (icons.length) rows.push({ k: "icons", icons });
  if (d.type !== "investigator" && (d.health !== undefined || d.sanity !== undefined))
    rows.push({ k: "stats", health: d.health, sanity: d.sanity });
  if (d.uses)
    rows.push({ k: "uses", n: d.uses.count, label: t(db, locale, `card.uses.${d.uses.type}`) });
  if (d.enemy) {
    const e = d.enemy;
    const labels = {
      fight: t(db, locale, "card.fight"),
      health: t(db, locale, "card.health"),
      evade: t(db, locale, "card.evade"),
      perInv: t(db, locale, "card.perInvestigator"),
    };
    rows.push({
      k: "enemy",
      fight: e.fight ?? "–",
      health: e.health ?? "–",
      perInv: e.healthPerInvestigator,
      evade: e.evade ?? "–",
      labels,
    });
    rows.push({
      k: "attack",
      damage: e.damage,
      horror: e.horror,
      label: t(db, locale, "card.attack"),
    });
    if (at?.inst.damage)
      rows.push({ k: "wounds", n: at.inst.damage, label: t(db, locale, "card.wounds") });
  }
  if (tx.text) rows.push({ k: "text", s: tx.text });
  rows.push(...glossary(db, code, locale));
  return rows;
}

const GAP = 12;
const PAD = 8;

/** the details column: right of the card (or left when asked to), the other side when it doesn't fit; top-aligned, clamped to the window */
export function placeDetails(
  r: Rect,
  w: number,
  h: number,
  vw: number,
  vh: number,
  prefer: "right" | "left" = "right",
): { x: number; y: number } {
  const right = r.x1 + GAP + w <= vw - PAD ? r.x1 + GAP : null;
  const left = r.x0 - GAP - w >= PAD ? r.x0 - GAP - w : null;
  const x =
    (prefer === "left" ? (left ?? right) : (right ?? left)) ??
    (prefer === "left" ? PAD : Math.max(PAD, r.x0 - GAP - w));
  const y = Math.min(Math.max(PAD, r.y0), Math.max(PAD, vh - PAD - h));
  return { x, y };
}

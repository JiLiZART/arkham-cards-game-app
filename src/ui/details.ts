import { cardText, encounterSetName, t } from "../content/i18n";
import { connectionsOf } from "../engine/core";
import type { CardInst, ContentDb, GameState, InvId } from "../engine/types";
import type { Rect } from "./hover";
import { keywordsOf } from "./glossary";
import type { IconName } from "./icons";

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
  | { k: "enemy"; fight: number; health: number; perInv: boolean; evade: number; labels: { fight: string; health: string; evade: string; perInv: string } }
  | { k: "attack"; damage: number; horror: number; label: string }
  | { k: "wounds"; n: number; label: string }
  | { k: "text"; s: string }
  // locations on the map
  | { k: "shroud"; n: number; skill?: IconName; label: string }
  | { k: "clues"; now: number; printed: number | null; perInv: boolean; label: string; perInvLabel: string }
  | { k: "victory"; label: string }
  | { k: "connections"; names: string[]; label: string }
  | { k: "here"; invs: InvId[]; enemies: string[]; label: string }
  // the card's keywords, each explained (glossary.ts)
  | { k: "keywords"; label: string; items: { name: string; text: string }[] };

/** the glossary row: each keyword the card has, by its name in the locale, with its explanation */
function glossary(db: ContentDb, code: string, locale: string): DetailRow[] {
  const items = keywordsOf(db.cards[code]).map((k) => ({ name: t(db, locale, `kw.${k}.name`), text: t(db, locale, `kw.${k}`) }));
  return items.length ? [{ k: "keywords", label: t(db, locale, "card.keywords"), items }] : [];
}

const SLOT_ICONS: Record<string, IconName> = { hand: "hand", arcane: "arcane", accessory: "accessory", body: "body", ally: "ally" };
const SKILLS = ["willpower", "intellect", "combat", "agility", "wild"] as const;

/** a card as it shows on the map (an unrevealed location goes by its back name) */
const shownName = (db: ContentDb, inst: CardInst, locale: string) => {
  const tx = cardText(db, inst.code, locale);
  return db.cards[inst.code].type === "location" && !inst.revealed ? tx.backName ?? tx.name : tx.name;
};

/** a location on the map: name, traits, shroud, clues, victory, connections, who is there and text; only the back when unrevealed */
function locationDetails(db: ContentDb, inst: CardInst, game: GameState, locale: string): DetailRow[] {
  const d = db.cards[inst.code];
  const tx = cardText(db, inst.code, locale);
  const invs = game.order.filter((i) => game.invs[i].location === inst.id);
  const enemies = Object.values(game.cards)
    .filter((c) => c.zone === "enemy" && c.location === inst.id)
    .map((c) => shownName(db, c, locale));
  const here: DetailRow[] = invs.length || enemies.length ? [{ k: "here", invs, enemies, label: t(db, locale, "card.here") }] : [];
  if (!inst.revealed) {
    const back = tx.backText ?? "";
    return [{ k: "name", name: tx.backName ?? tx.name }, ...here, ...(back ? [{ k: "text", s: back } as DetailRow] : [])];
  }
  const rows: DetailRow[] = [{ k: "name", name: tx.name, subname: tx.subname }];
  if (tx.traits?.length) rows.push({ k: "traits", s: tx.traits.map((s) => `${s}.`).join(" ") });
  if (d.shroud !== undefined) rows.push({ k: "shroud", n: d.shroud, skill: d.investigateSkill && d.investigateSkill !== "intellect" ? d.investigateSkill : undefined, label: t(db, locale, "card.shroud") });
  rows.push({ k: "clues", now: inst.clues, printed: d.clues ?? null, perInv: !!d.cluesPerInvestigator, label: t(db, locale, "card.clues"), perInvLabel: t(db, locale, "card.perInvestigator") });
  if (d.victory) rows.push({ k: "victory", label: t(db, locale, "card.victory", { n: d.victory }) });
  const names = connectionsOf(db, game, inst.id).map((id) => shownName(db, game.cards[id], locale));
  if (names.length) rows.push({ k: "connections", names, label: t(db, locale, "card.connections") });
  rows.push(...here);
  if (tx.text) rows.push({ k: "text", s: tx.text });
  rows.push(...glossary(db, inst.code, locale));
  return rows;
}

/** what a card is, row by row, from its card data (missing fields are skipped), translated; a map location with its instance */
export function cardDetails(db: ContentDb, code: string, locale: string, at?: { inst: CardInst; game: GameState }): DetailRow[] {
  if (at && db.cards[code].type === "location") return locationDetails(db, at.inst, at.game, locale);
  const d = db.cards[code];
  const tx = cardText(db, code, locale);
  const rows: DetailRow[] = [{ k: "name", name: tx.name, subname: tx.subname }];
  const type = [t(db, locale, `card.type.${d.type}`), d.subtype ? t(db, locale, "card.weakness") : null].filter(Boolean).join(" · ");
  rows.push({ k: "class", faction: d.faction, label: `${t(db, locale, `card.faction.${d.faction}`)} · ${type}` });
  if (d.xp !== undefined) rows.push({ k: "level", xp: d.xp, label: t(db, locale, "card.level", { n: d.xp }) });
  if (["asset", "event", "skill"].includes(d.type)) rows.push({ k: "cost", cost: d.cost === undefined || d.cost === null ? "—" : String(d.cost) });
  // encounter cards also name their encounter set (it used to sit under the hover copy)
  const set = d.encounterSet ? encounterSetName(db, d.encounterSet, locale) : null;
  const traits = [tx.traits?.map((s) => `${s}.`).join(" "), set].filter(Boolean).join(" · ");
  if (traits) rows.push({ k: "traits", s: traits });
  const slots = d.slots.map((s) => SLOT_ICONS[s]).filter(Boolean);
  if (slots.length) rows.push({ k: "slots", slots });
  const icons = SKILLS.flatMap((s) => Array<IconName>(d.icons[s] ?? 0).fill(s));
  if (icons.length) rows.push({ k: "icons", icons });
  if (d.type !== "investigator" && (d.health !== undefined || d.sanity !== undefined)) rows.push({ k: "stats", health: d.health, sanity: d.sanity });
  if (d.uses) rows.push({ k: "uses", n: d.uses.count, label: t(db, locale, `card.uses.${d.uses.type}`) });
  if (d.enemy) {
    const e = d.enemy;
    const labels = { fight: t(db, locale, "card.fight"), health: t(db, locale, "card.health"), evade: t(db, locale, "card.evade"), perInv: t(db, locale, "card.perInvestigator") };
    rows.push({ k: "enemy", fight: e.fight, health: e.health, perInv: e.healthPerInvestigator, evade: e.evade, labels });
    rows.push({ k: "attack", damage: e.damage, horror: e.horror, label: t(db, locale, "card.attack") });
    if (at?.inst.damage) rows.push({ k: "wounds", n: at.inst.damage, label: t(db, locale, "card.wounds") });
  }
  if (tx.text) rows.push({ k: "text", s: tx.text });
  rows.push(...glossary(db, code, locale));
  return rows;
}

const GAP = 12;
const PAD = 8;

/** the details column: right of the card (or left when asked to), the other side when it doesn't fit; top-aligned, clamped to the window */
export function placeDetails(r: Rect, w: number, h: number, vw: number, vh: number, prefer: "right" | "left" = "right"): { x: number; y: number } {
  const right = r.x1 + GAP + w <= vw - PAD ? r.x1 + GAP : null;
  const left = r.x0 - GAP - w >= PAD ? r.x0 - GAP - w : null;
  const x = (prefer === "left" ? (left ?? right) : (right ?? left)) ?? (prefer === "left" ? PAD : Math.max(PAD, r.x0 - GAP - w));
  const y = Math.min(Math.max(PAD, r.y0), Math.max(PAD, vh - PAD - h));
  return { x, y };
}

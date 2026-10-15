import { t } from "../content/i18n";
import type { ContentDb, GameEvent, GameState, InstId, InvId } from "../engine/types";
import { isIcon, type IconName } from "./icons";

/** one piece of a styled sentence */
export type Part =
  | { t: "text"; s: string }
  | { t: "strong"; s: string }
  | { t: "inv"; id: InvId }
  | { t: "card"; id: InstId }
  | { t: "amount"; n: number; icon: IconName }
  | { t: "num"; n: number }
  | { t: "icon"; name: IconName }
  | { t: "token"; token: string }
  | { t: "outcome"; ok: boolean }
  /** n copies of a font glyph (e.g. the action symbol) and the number */
  | { t: "glyphs"; name: string; n: number };

export type Tone = "player" | "enemy" | "game";
export interface FeedEntry {
  parts: Part[];
  /** the engine event type ("phase", "attack"…) */
  kind: string;
  tone: Tone;
  /** who did it, to anchor the float: an investigator or a map card */
  actor: { inv?: InvId; card?: InstId } | null;
}

/** events that would only be noise in the feed (they have their own display or say nothing new) */
export const HIDDEN = new Set(["setup", "shuffle", "ready", "action", "token", "testStart", "noToken"]);
/** events done by enemies (or the encounter deck) rather than an investigator */
const ENEMY = new Set(["attack", "spawn", "enemyMove", "attackCancelled", "spawnFail"]);
const ICONS = new Set<string>(["resource", "clue", "damage", "horror", "doom", "health", "sanity", "willpower", "intellect", "combat", "agility", "wild"]);
const NUMERIC = new Set(["n", "damage", "horror", "total", "difficulty", "round", "amount", "actions", "left"]);

/** template key for an event (some types have variants) */
export function templateKey(e: GameEvent): string {
  if (e.type === "resource" && e.data?.lost) return "feed.resourceLost";
  if (e.type === "clues" && e.data?.placed) return "feed.cluesPlaced";
  if (e.type === "clues" && !e.card) return "feed.cluesGained";
  if (e.type === "engage" && e.data?.byInv) return "feed.engageBy";
  if (e.type === "heal" && !e.inv) return "feed.healCard";
  return `feed.${e.type}`;
}

/**
 * Fill a template like "{inv} took {n:resource}" from an event. Placeholders:
 * {inv} {card} {at} {from} {to} {by} → portrait / card parts; {n:icon} → amount with icon (dropped when 0);
 * {n} → a bold number; {skill} → skill icon; {tokens}/{token} → chaos tokens; {outcome} → success / fail;
 * {phase} → translated phase name; {text} → the engine's text.
 */
export function fillTemplate(template: string, e: GameEvent, game: GameState, db: ContentDb, locale: string): Part[] {
  const parts: Part[] = [];
  const data = (e.data ?? {}) as Record<string, unknown>;
  const re = /\{(\w+)(?::(\w+))?\}/g;
  let at = 0;
  for (let m = re.exec(template); m; m = re.exec(template)) {
    if (m.index > at) parts.push({ t: "text", s: template.slice(at, m.index) });
    at = re.lastIndex;
    const [, name, icon] = m;
    const value = name === "inv" ? e.inv : name === "card" ? e.card : data[name];
    if (name === "inv" || name === "by") {
      if (typeof value === "string" && game.invs[value]) parts.push({ t: "inv", id: value });
    } else if (["card", "at", "from", "to"].includes(name)) {
      if (typeof value === "string" && game.cards[value]) parts.push({ t: "card", id: value });
    } else if (NUMERIC.has(name)) {
      const n = Number(value ?? 0);
      if (icon === "action") parts.push({ t: "glyphs", name: "action", n });
      else if (icon && ICONS.has(icon)) {
        if (n) parts.push({ t: "amount", n, icon: icon as IconName });
      } else parts.push({ t: "num", n });
    } else if (name === "skill") {
      if (typeof value === "string" && ICONS.has(value)) parts.push({ t: "icon", name: value as IconName });
    } else if (name === "tokens") {
      for (const tok of (value as string[] | undefined) ?? []) parts.push({ t: "token", token: tok });
    } else if (name === "token") {
      if (value) parts.push({ t: "token", token: String(value) });
    } else if (name === "outcome") {
      parts.push({ t: "outcome", ok: !!data.success });
    } else if (name === "phase") {
      parts.push({ t: "strong", s: t(db, locale, `phase.${String(value)}`) });
    } else if (name === "text") {
      parts.push({ t: "text", s: e.text });
    } else if (typeof value === "string" && isIcon(value)) {
      parts.push({ t: "icon", name: value });
    } else parts.push({ t: "text", s: String(value ?? "") });
  }
  if (at < template.length) parts.push({ t: "text", s: template.slice(at) });
  // tidy: collapse doubled spaces left by dropped parts, drop empty text
  return parts
    .map((p) => (p.t === "text" ? { ...p, s: p.s.replace(/\s{2,}/g, " ") } : p))
    .filter((p) => p.t !== "text" || p.s.trim() !== "" || p.s === " ");
}

/** an engine event as a styled feed entry, or null for events the feed hides */
export function feedEntry(e: GameEvent, game: GameState, db: ContentDb, locale: string): FeedEntry | null {
  if (HIDDEN.has(e.type)) return null;
  const key = templateKey(e);
  const template = t(db, locale, key);
  const parts =
    template === key
      ? // no template: a styled generic entry (who or what, then the engine's text)
        [...(e.inv && game.invs[e.inv] ? [{ t: "inv", id: e.inv } as Part] : e.card && game.cards[e.card] ? [{ t: "card", id: e.card } as Part] : []), { t: "text", s: ` ${e.text}` } as Part]
      : fillTemplate(template, e, game, db, locale);
  const tone: Tone = ENEMY.has(e.type) ? "enemy" : e.inv ? "player" : "game";
  const mapCard = e.card && game.cards[e.card] && ["enemy", "location"].includes(game.cards[e.card].zone) ? e.card : undefined;
  const actor = tone === "enemy" ? { card: mapCard } : e.inv ? { inv: e.inv } : mapCard ? { card: mapCard } : null;
  return { parts, tone, actor, kind: e.type };
}

/** about how many characters a styled sentence reads as (names and card titles count as a dozen) */
export function readLength(parts: Part[]): number {
  return parts.reduce((n, p) => n + (p.t === "text" || p.t === "strong" ? p.s.length : p.t === "inv" || p.t === "card" ? 12 : 2), 0);
}

/** how long an action float stays (ms): 3.5 s, plus 60 ms per character past 30, at most 6 s */
export const floatLife = (parts: Part[]) => Math.min(6000, 3500 + 60 * Math.max(0, readLength(parts) - 30));

/**
 * How many log entries the feed may show: everything before the next animated event that hasn't started playing.
 * The playing event and what follows it show together; the rest waits for its own animation.
 */
export function shownCount(logLength: number, current: { logIndex: number } | null, queue: { logIndex: number }[]): number {
  if (queue.length) return queue[0].logIndex;
  return current ? Math.max(current.logIndex + 1, logLength) : logLength;
}

/** the prompt of a pending choice as styled parts (after the deciding investigator), or null when it has no template */
export function promptParts(p: { inv: InvId; prompt: string; promptKey?: string; promptVars?: Record<string, string | number | null> }, game: GameState, db: ContentDb, locale: string): Part[] | null {
  if (!p.promptKey) return null;
  const key = `prompt.${p.promptKey}`;
  const template = t(db, locale, key);
  if (template === key) return null;
  const vars = p.promptVars ?? {};
  const e: GameEvent = { type: "prompt", text: p.prompt, inv: p.inv, card: typeof vars.card === "string" ? vars.card : null, data: vars };
  return fillTemplate(template, e, game, db, locale);
}

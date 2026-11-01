import { doomInPlay } from "../../engine/rules/scenario";
import type { ContentDb, GameEvent, GameState, InstId } from "../../engine/types";
import { type CardSoundWhen, NO_SOUND, type SoundManifest } from "../../content/schema";
import { db } from "../state/context";
import { cardOf, cardOfIf, cardsOf } from "../../engine/core";

/** the settings the gains depend on (a slice of UiState) */
export interface SoundSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export { MOMENTS } from "../../content/soundSlots";

/** a card's own clip for a moment (play, fight, spawn): by code, then by the first trait the manifest lists, else null */
function cardClip(
  when: CardSoundWhen,
  cardId: InstId | null,
  game: GameState | null,
  m: SoundManifest,
  content: ContentDb = db,
): string | null {
  const inst = cardId && game ? cardOfIf(game, cardId) : null;
  if (!inst) return null;
  const own = m.cards[inst.code]?.[when];
  if (own) return own;
  const byTrait = m.traits[when] ?? {};
  const traits = new Set(content.cards[inst.code]?.traits ?? []);
  for (const [trait, clip] of Object.entries(byTrait)) if (traits.has(trait)) return clip;
  return null;
}

const isWhen = (name: string): name is CardSoundWhen =>
  name === "play" || name === "fight" || name === "spawn";

/** the clips for an animated event (an event's data picks a variant), or null when the event has no sound */
export function effectFor(
  e: GameEvent,
  game: GameState,
  m: SoundManifest,
  content: ContentDb = db,
): string[] | null {
  const d = (e.data ?? {}) as Record<string, unknown>;
  const of = (key: string) => {
    const v = m.events[key];
    return v === undefined ? null : Array.isArray(v) ? v : [v];
  };
  if (e.type === "damage") {
    // the same event carries damage and horror: one clip for each that is dealt
    const clips = [
      ...(Number(d.damage ?? 0) > 0 ? (of("damage") ?? []) : []),
      ...(Number(d.horror ?? 0) > 0 ? (of("damage:horror") ?? []) : []),
    ];
    return clips.length ? clips : null;
  }
  if (e.type === "testResult" && d.success === false)
    return of("testResult:fail") ?? of("testResult");
  if (e.type === "spawn") {
    const own = cardClip("spawn", e.card ?? null, game, m, content);
    if (own) return [own];
  }
  return of(e.type);
}

/** the clip for a UI moment: for play, fight and spawn the card's own clip first; else the moment's generic clip; null for none */
export function momentClip(
  name: string,
  cardId: InstId | null,
  game: GameState | null,
  m: SoundManifest,
  content: ContentDb = db,
): string | null {
  const own = isWhen(name) ? cardClip(name, cardId, game, m, content) : null;
  const generic = m.moments[name];
  return own ?? (generic === NO_SOUND ? null : (generic ?? null));
}

/** a track's take for this game: `<id>:alt` when the manifest has one and the seed picks it, so a replay sounds the same */
function take(id: string, seed: number, m: SoundManifest): string {
  if (!m.music[`${id}:alt`]) return id;
  let h = seed | 0;
  for (const ch of id) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return (h >>> 0) % 2 ? `${id}:alt` : id;
}

/**
 * which music track should play: fight while an enemy is engaged; tension (the scenario's own, else the shared one, unless silent) in
 * the enemy phase or one doom from the agenda advancing; else the current agenda's track, the current act's, the
 * scenario's bed. Null when the scenario has ended or has none of these.
 */
export function musicFor(
  game: GameState,
  m: SoundManifest,
  content: ContentDb = db,
): string | null {
  if (game.phase === "ended") return null;
  // a silent track keeps its slot but is never chosen: the music that was on goes on
  const has = (id: string) => (m.music[id] && !m.music[id].silent ? id : null);
  const codeOf = (id: InstId | null) => (id ? cardOfIf(game, id)?.code : undefined);
  // a scenario without a bed of its own (a generated one, ADR-0007) plays the default bed
  const chapter =
    has(`card:${codeOf(game.agenda)}`) ??
    has(`card:${codeOf(game.act)}`) ??
    has(`bed:${game.scenarioId}`) ??
    has("bed:default");
  if (!chapter) return null;
  if (has("fight") && cardsOf(game).some((c) => c.zone === "enemy" && c.engagedWith))
    return take("fight", game.seed, m);
  const tension = has(`tension:${game.scenarioId}`) ?? has("tension");
  if (tension) {
    const threshold = game.agenda ? content.cards[cardOf(game, game.agenda).code]?.doom : undefined;
    if (
      game.phase === "enemy" ||
      (threshold !== undefined &&
        doomInPlay({ s: game, db: content, events: [] }) === threshold - 1)
    )
      return take(tension, game.seed, m);
  }
  return take(chapter, game.seed, m);
}

/** the menu theme, or its other take when the coin (0 to 1, drawn once per page load) says so; null without one */
export function menuMusic(m: SoundManifest, coin: number): string | null {
  if (!m.music.menu) return null;
  return coin >= 0.5 && m.music["menu:alt"] ? "menu:alt" : "menu";
}

/** the gain to play a clip at: its own gain scaled by the category's slider; 0 when muted */
export function gainOf(s: SoundSettings, category: "music" | "effects", clipGain: number): number {
  if (s.muted) return 0;
  return ((category === "music" ? s.musicVolume : s.sfxVolume) / 100) * clipGain;
}

/** a moment's clip sounds at most once in this many ms: a burst (three cards discarded at once) is one sound */
export const MOMENT_GAP = 60;

/** whether `name` (a moment's clip) may sound at `now`; records it when it may */
export function mayPlay(last: Map<string, number>, name: string, now: number): boolean {
  const before = last.get(name);
  if (before !== undefined && now - before < MOMENT_GAP) return false;
  last.set(name, now);
  return true;
}

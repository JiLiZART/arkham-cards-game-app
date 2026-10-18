import { doomInPlay } from "../engine/rules/scenario";
import type { ContentDb, GameEvent, GameState, InstId } from "../engine/types";
import type { CardSoundWhen, SoundManifest } from "../content/schema";
import { db } from "./context";

/** the settings the gains depend on (a slice of UiState) */
export interface SoundSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

/** a card's own clip for a moment (play, fight, spawn): by code, then by the first trait the manifest lists, else null */
function cardClip(when: CardSoundWhen, cardId: InstId | null, game: GameState, m: SoundManifest, content: ContentDb = db): string | null {
  const inst = cardId ? game.cards[cardId] : null;
  if (!inst) return null;
  const own = m.cards[inst.code]?.[when];
  if (own) return own;
  const byTrait = m.traits[when] ?? {};
  const traits = new Set(content.cards[inst.code]?.traits ?? []);
  for (const [trait, clip] of Object.entries(byTrait)) if (traits.has(trait)) return clip;
  return null;
}

const isWhen = (name: string): name is CardSoundWhen => name === "play" || name === "fight" || name === "spawn";

/** the clips for an animated event (an event's data picks a variant), or null when the event has no sound */
export function effectFor(e: GameEvent, game: GameState, m: SoundManifest, content: ContentDb = db): string[] | null {
  const d = (e.data ?? {}) as Record<string, unknown>;
  const of = (key: string) => {
    const v = m.events[key];
    return v === undefined ? null : Array.isArray(v) ? v : [v];
  };
  if (e.type === "damage") {
    // the same event carries damage and horror: one clip for each that is dealt
    const clips = [...(Number(d.damage ?? 0) > 0 ? (of("damage") ?? []) : []), ...(Number(d.horror ?? 0) > 0 ? (of("damage:horror") ?? []) : [])];
    return clips.length ? clips : null;
  }
  if (e.type === "testResult" && d.success === false) return of("testResult:fail") ?? of("testResult");
  if (e.type === "spawn") {
    const own = cardClip("spawn", e.card ?? null, game, m, content);
    if (own) return [own];
  }
  return of(e.type);
}

/** the clip for a UI moment: for play, fight and spawn the card's own clip first; else the moment's generic clip; null for none */
export function momentClip(name: string, cardId: InstId | null, game: GameState, m: SoundManifest, content: ContentDb = db): string | null {
  const own = isWhen(name) ? cardClip(name, cardId, game, m, content) : null;
  return own ?? m.moments[name] ?? null;
}

/** which music track should play: fight while an enemy is engaged, tension in the enemy phase or one doom from the agenda advancing, else the scenario's bed; null when the scenario has ended or has no bed */
export function musicFor(game: GameState, m: SoundManifest, content: ContentDb = db): string | null {
  if (game.phase === "ended") return null;
  // a scenario without a bed of its own (a generated one, ADR-0007) plays the default bed
  const bed = m.music[`bed:${game.scenarioId}`] ? `bed:${game.scenarioId}` : m.music["bed:default"] ? "bed:default" : null;
  if (!bed) return null;
  if (m.music.fight && Object.values(game.cards).some((c) => c.zone === "enemy" && c.engagedWith)) return "fight";
  if (m.music.tension) {
    if (game.phase === "enemy") return "tension";
    const threshold = game.agenda ? content.cards[game.cards[game.agenda].code]?.doom : undefined;
    if (threshold !== undefined && doomInPlay({ s: game, db: content, events: [] }) === threshold - 1) return "tension";
  }
  return bed;
}

/** the gain to play a clip at: its own gain scaled by the category's slider; 0 when muted */
export function gainOf(s: SoundSettings, category: "music" | "effects", clipGain: number): number {
  if (s.muted) return 0;
  return ((category === "music" ? s.musicVolume : s.sfxVolume) / 100) * clipGain;
}

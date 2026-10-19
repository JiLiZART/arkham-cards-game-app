import type { ContentDb } from "../engine/types";

/** the keywords the engine acts on by themselves (CardDef.keywords) */
const KEYWORD = /^(hunter|retaliate|aloof|alert|massive|surge|peril|fast|exceptional)(\s*\(\d+\))?$/i;

/**
 * Whether a card works in the game: its behaviour is written (abilities or a script), or there is no rules text for the
 * engine to run: nothing at all, keywords the engine knows, or a spawn instruction it reads from the data.
 */
export function implemented(db: ContentDb, code: string): boolean {
  const c = db.cards[code];
  if (!c) return false;
  if (c.abilities.length || db.scripts[code]) return true;
  const lines = c.text.replace(/<[^>]+>/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.every((l) => /^Spawn - /.test(l) || l.split(".").map((p) => p.trim()).filter(Boolean).every((p) => KEYWORD.test(p)));
}

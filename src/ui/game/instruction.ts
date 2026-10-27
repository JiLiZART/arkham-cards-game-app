import type { ContentDb, GameState, PendingChoice } from "../../engine/types";
import { promptParts, type Part } from "./feed";

/**
 * What the instruction bar says for a pending choice (after the deciding investigator): the plain-words instruction,
 * else the prompt's own sentence, else the engine's English text without the leading name (the bar shows it).
 */
export function instructionParts(
  p: Pick<PendingChoice, "inv" | "prompt" | "promptKey" | "promptVars">,
  game: GameState,
  db: ContentDb,
  locale: string,
): Part[] {
  const parts = promptParts(p, game, db, locale, "instruction") ?? promptParts(p, game, db, locale);
  if (parts) return parts;
  const prefix = `${db.cards[p.inv]?.name}:`;
  return [
    { t: "text", s: p.prompt.startsWith(prefix) ? p.prompt.slice(prefix.length).trim() : p.prompt },
  ];
}

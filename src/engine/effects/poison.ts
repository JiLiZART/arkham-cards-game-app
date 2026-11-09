/** The Poisoned weakness (The Forgotten Age): a set-aside copy put into play in a threat area, once. */
import { emit, invName, setController, type GameContext } from "../context";
import { moveCard } from "../movement";
import { findByCode, poisoned, POISONED } from "../queries";
import { ZONE } from "../world/constants";
import { EVENT } from "../events/event";
import type { EffectOf, EffectRun } from "./types";

/** "If you are not poisoned, put a set-aside Poisoned weakness into play in your threat area" (none left: nothing) */
function poisonEffect(game: GameContext, run: EffectRun<EffectOf<"poison">>) {
  if (poisoned(game, run.you)) return;
  const copy = findByCode(game, POISONED, [ZONE.SetAside]);
  if (!copy) return;
  moveCard(game, copy.id, ZONE.Threat);
  setController(game, copy.id, run.you);
  emit(game, EVENT.Threat, `${invName(game, run.you)} is poisoned`, {
    inv: run.you,
    card: copy.id,
  });
}

export const poisonEffects = { poison: poisonEffect };

// Uncovering the Conspiracy (Midnight Masks, act 1)
import {
  type CardScript,
  def,
  emit,
  type GameContext,
  moveCard,
  push,
  sideDeck,
  EVENT,
  ZONE,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      label: "Spend 2 clues per investigator: draw from the Cultist deck",
      usableBy: "anyone",
      cost: { cluesPerInvestigator: 2 },
      run: "drawCultist",
    },
    { kind: "revelation", effects: [{ op: EVENT.Resolution, id: "R1" }] },
  ],
  fns: {
    drawCultist(game: GameContext, run: ScriptRun) {
      const id = sideDeck(game, "cultists")[0];
      if (!id) {
        emit(game, EVENT.Empty, "The Cultist deck is empty");
        return;
      }
      emit(game, EVENT.Encounter, `Drawn from the Cultist deck: ${def(game, id).name}`, {
        card: id,
      });
      moveCard(game, id, ZONE.Limbo);
      push(game, { t: STEP.Spawn, enemy: id, inv: run.you });
    },
  },
} satisfies CardScript;

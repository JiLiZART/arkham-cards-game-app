// Porte de l'Avancée (Black Stars Rise) — [action][action]: move 1 doom from one agenda deck to the other, then place 2
// clues here from the token bank. Moved doom isn't placed: no "after doom is placed" ability answers it.
import {
  addCounter,
  card,
  type CardScript,
  def,
  emit,
  type EffCtx,
  type GameContext,
  type ScriptRun,
  EVENT,
} from "../../../../src/engine/api";
import { agendasInPlay } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [
    {
      kind: "action",
      actionCost: 2,
      label: "Porte de l'Avancée: move 1 doom to the other agenda, place 2 clues here",
      condition: { script: "twoDecksWithDoom" },
      run: "moveDoom",
    },
  ],
  conditions: {
    twoDecksWithDoom: (game: GameContext, _ctx: EffCtx) =>
      agendasInPlay(game).length === 2 && agendasInPlay(game).some((id) => card(game, id).doom > 0),
  },
  fns: {
    moveDoom(game: GameContext, run: ScriptRun) {
      const both = agendasInPlay(game);
      const from = run.chooseCard(
        both.filter((id) => card(game, id).doom > 0),
        { text: "Move 1 doom from which agenda?", key: "bsrMoveDoomFrom" },
      );
      const to = both.find((id) => id !== from)!;
      addCounter(game, from, "doom", -1);
      addCounter(game, to, "doom", 1);
      emit(game, EVENT.Doom, `1 doom moves from ${def(game, from).name} to ${def(game, to).name}`, {
        card: to,
        data: { n: 1 },
      });
      addCounter(game, run.source, "clues", 2);
      emit(game, EVENT.Place, `2 clues are placed on ${def(game, run.source).name}`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;

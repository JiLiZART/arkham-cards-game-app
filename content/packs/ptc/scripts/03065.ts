// Sickening Reality (The Last King, five copies, one for each Bystander) — each investigator at the Bystander's
// location takes 1 horror; its clues go to that location; this card flips to its enemy side and takes the Bystander's
// place, the Bystander leaving the game.
import {
  allCards,
  card,
  type CardScript,
  def,
  emit,
  type GameContext,
  invsAt,
  moveCard,
  addCounter,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  dealDamage,
  flip,
} from "../../../../src/engine/api";
import { BYSTANDERS } from "../../../campaigns/the-path-to-carcosa/scripts/the-last-king";

/** the Sickening Reality that turns this Bystander */
export const reality = (code: string): CardScript => ({
  abilities: [{ kind: "revelation", run: "turn" }],
  fns: {
    turn(game: GameContext, run: ScriptRun) {
      const bystander = Object.entries(BYSTANDERS).find(([, b]) => b.reality === code)?.[0];
      const b = allCards(game).find((c) => c.code === bystander && c.zone === ZONE.Attached);
      if (!b?.location) {
        moveCard(game, run.source, ZONE.Removed);
        return;
      }
      const at = b.location;
      const clues = card(game, b.id).clues;
      if (clues) {
        addCounter(game, b.id, "clues", -clues);
        addCounter(game, at, "clues", clues);
        emit(
          game,
          EVENT.Clues,
          `${clues} clue(s) move from ${def(game, b.id).name} to ${def(game, at).name}`,
          {
            card: at,
            data: { n: clues, placed: true },
          },
        );
      }
      moveCard(game, b.id, ZONE.Removed);
      // the story card takes the Bystander's place, then turns into its enemy side there
      moveCard(game, run.source, ZONE.SetAside, { location: at });
      queue(
        game,
        ...invsAt(game, at).map((i) =>
          dealDamage({ inv: i, damage: 0, horror: 1, direct: false, source: run.source }),
        ),
        flip(run.source),
      );
    },
  },
});

export default reality("03065") satisfies CardScript;

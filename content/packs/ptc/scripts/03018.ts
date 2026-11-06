// Improvisation — Lola Hayes switches her role; the next card of her new role she plays this turn costs 3 less; she
// draws 1 card
import {
  addTempMod,
  type CardScript,
  drawCards,
  emit,
  EVENT,
  flags,
  type GameContext,
  inv,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

const ROLES = ["survivor", "guardian", "seeker", "rogue", "mystic", "neutral"];

export default {
  abilities: [{ kind: "onPlay", condition: { yourTurn: true }, run: "improvise" }],
  fns: {
    improvise(game: GameContext, run: ScriptRun) {
      const now = flags.role.get(game, run.you);
      const role = run.choose<string>(
        ROLES.filter((r) => r !== now).map((r) => ({
          id: r,
          label: r,
          value: r,
          key: `card.faction.${r}`,
        })),
        { text: "Choose a role", key: "lolaRole" },
        { auto: false },
      );
      flags.role.set(game, run.you, role);
      emit(game, EVENT.Place, `${inv(game, run.you).name}'s role is now ${role}`, {
        inv: run.you,
        data: { role },
      });
      addTempMod(
        game,
        { stat: "cost", value: -3, filter: { faction: role } },
        run.you,
        "turn",
        run.source,
        false,
        "play",
      );
      queue(game, drawCards({ inv: run.you, n: 1 }));
    },
  },
} satisfies CardScript;

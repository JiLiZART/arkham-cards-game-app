// Twisted to His Will — with no doom in play it gains surge; otherwise test [willpower] (X), X the doom in play: a
// failure discards 2 cards from your hand at random.
import {
  allCards,
  type CardScript,
  flags,
  type GameContext,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

const DOOM_ZONES: string[] = [
  ZONE.Act,
  ZONE.Agenda,
  ZONE.Enemy,
  ZONE.Play,
  ZONE.Location,
  ZONE.Attached,
  ZONE.Threat,
];
/** the doom on every card in play */
export const doomInPlay = (game: GameContext) =>
  allCards(game)
    .filter((c) => DOOM_ZONES.includes(c.zone))
    .reduce((n, c) => n + c.doom, 0);

export default {
  abilities: [{ kind: "revelation", run: "twist" }],
  fns: {
    twist(game: GameContext, run: ScriptRun) {
      const doom = doomInPlay(game);
      if (!doom) {
        flags.surge.set(game, run.source, true);
        return;
      }
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: doom,
            onFail: [{ op: "discardFromHand", amount: 2, random: true }],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;

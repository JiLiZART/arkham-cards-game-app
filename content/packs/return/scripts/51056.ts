// Seth Bishop (Thrall of Yog-Sothoth, Return to Lost in Time and Space) — Retaliate is a keyword; forced when he
// attacks you during the enemy phase: you move to Another Dimension after the attack (Realms Beyond takes you while in
// play), or he deals +2 damage for it. Devoured when Yog-Sothoth and he share a location: the scenario's
// checkObjectives.
import {
  currentRound,
  flags,
  type GameContext,
  type CardScript,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  encounterMove,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import { anotherDimension } from "../../../campaigns/return-to-the-dunwich-legacy/scripts/return-to-lost-in-time-and-space";

const dragKey = (game: GameContext, i: string) => `sethDrags:${currentRound(game)}:${i}`;

export default {
  fns: {
    ...SHARED.fns,
    sethLunges(game: GameContext, run: ScriptRun) {
      const i = run.ctx.inv;
      if (!i) return;
      const move = run.choose<boolean>(
        [
          {
            id: "move",
            label: "Move to Another Dimension after this attack",
            value: true,
            key: "option.sethMove",
          },
          {
            id: "damage",
            label: "Seth Bishop deals +2 damage for this attack",
            value: false,
            key: "option.sethDamage",
          },
        ],
        { text: "Seth Bishop attacks: choose one", key: "sethAttacks" },
        { who: i, auto: false },
      );
      if (move) flags.setNamed(game, dragKey(game, i), true);
      else if (run.ctx.key) flags.attackDamageBonus.add(game, run.ctx.key, 2);
    },
    sethDrags(game: GameContext, run: ScriptRun) {
      const i = run.ctx.inv;
      if (!i || !flags.named(game, dragKey(game, i))) return;
      flags.clearNamed(game, dragKey(game, i));
      const to = anotherDimension(game);
      if (to) queue(game, ...encounterMove(game, i, to));
    },
  },
} satisfies CardScript;

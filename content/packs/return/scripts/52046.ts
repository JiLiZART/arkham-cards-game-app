// Gardens of Luxembourg (Return to A Phantom of Truth) — Forced: after you enter it, with a [[Byakhee]] enemy in play,
// reveal a random chaos token; on a symbol or the auto-fail, each [[Byakhee]] enemy in play readies and moves to it.
import {
  type CardScript,
  def,
  emit,
  enemies,
  EVENT,
  type GameContext,
  invsAt,
  isAloof,
  ready,
  type ScriptRun,
  setCardLocation,
  setEngaged,
} from "../../../../src/engine/api";

const byakhee = (game: GameContext) =>
  enemies(game).filter((e) => def(game, e.id).traits.includes("Byakhee"));

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enterLocation",
      condition: { all: [{ eventAtThisLocation: true }, { script: "byakheeInPlay" }] },
      effects: [
        {
          op: "revealToken",
          on: [
            {
              tokens: ["skull", "cultist", "tablet", "elderThing", "autoFail"],
              effects: [{ op: "script", fn: "summon" }],
            },
          ],
        },
      ],
    },
  ],
  conditions: { byakheeInPlay: (game: GameContext) => byakhee(game).length > 0 },
  fns: {
    summon(game: GameContext, run: ScriptRun) {
      for (const e of byakhee(game)) {
        ready(game, e.id);
        if (e.location === run.source) continue;
        setEngaged(game, e.id, null);
        setCardLocation(game, e.id, run.source);
        emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to Gardens of Luxembourg`, {
          card: e.id,
        });
        // a ready enemy entering an investigator's location engages them (the one who entered)
        const who = run.ctx.inv ?? run.you;
        if (!isAloof(game, e.id) && invsAt(game, run.source).includes(who))
          setEngaged(game, e.id, who);
      }
    },
  },
} satisfies CardScript;

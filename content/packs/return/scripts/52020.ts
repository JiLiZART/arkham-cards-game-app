// La Comtesse (Return to Curtain Call) — Spawn: Balcony; Hunter. After you defeat her she goes into your hand as a
// hidden card; there she counts as 4 cards for your hand size (your hand size is 3 lower, the same check), and after you
// discard cards down to your hand size in the upkeep phase you take 1 horror. Her defeat runs whole first (she is
// discarded like any defeated enemy); the scenario's objective check then hands her to whoever defeated her.
import {
  allCards,
  card,
  type CardScript,
  type EffCtx,
  flags,
  type GameContext,
  hideInHand,
  type ScriptRun,
  turnOrder,
  ZONE,
} from "../../../../src/engine/api";

const COMTESSE = "52020";
const defeatedBy = (id: string, i: string) => `comtesseDefeatedBy:${id}:${i}`;

/** La Comtesse, defeated and discarded, goes into her defeater's hand (the scenario's checkObjectives) */
export function comtesseToHand(game: GameContext) {
  for (const c of allCards(game)) {
    if (c.code !== COMTESSE || c.zone !== ZONE.EncounterDiscard) continue;
    const who = turnOrder(game).find((i) => flags.named(game, defeatedBy(c.id, i)));
    if (!who) continue;
    flags.clearNamed(game, defeatedBy(c.id, who));
    hideInHand(game, c.id, who);
  }
}

export default {
  abilities: [
    { kind: "forced", trigger: "enemyDefeatedSelf", run: "defeated" },
    {
      kind: "constant",
      condition: { script: "inHand" },
      modifiers: [{ stat: "handSize", value: -3 }],
    },
    {
      kind: "forced",
      trigger: "discardedToHandSize",
      condition: { all: [{ script: "inHand" }, { eventInvestigatorIsYou: true }] },
      effects: [{ op: "takeHorror", amount: 1 }],
    },
  ],
  conditions: {
    inHand: (game: GameContext, ctx: EffCtx) => card(game, ctx.source!).zone === ZONE.Hand,
  },
  fns: {
    defeated(game: GameContext, run: ScriptRun) {
      if (run.ctx.inv) flags.setNamed(game, defeatedBy(run.source, run.ctx.inv), true);
    },
  },
} satisfies CardScript;

// Realm of Madness (Dim Carcosa): discard cards from your play area and/or hand with a total printed cost of at least
// X, X the horror on you; if no cards are discarded, take 2 horror. Discarding is the investigator's choice while
// their cards can reach X (one card at a time until they do); otherwise, or by choice, the 2 horror.
import {
  asNumber,
  type CardScript,
  controlled,
  def,
  discard,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  type ScriptRun,
  queue,
  dealDamage,
  runScript,
} from "../../../../src/engine/api";

const CODE = "03338";
const cost = (game: GameContext, id: InstId) => {
  const c = def(game, id).cost;
  return typeof c === "number" ? c : 0;
};
/** the cards of yours that may be discarded: in hand, and the assets you control that can leave play (not The Pallid Mask) */
const yours = (game: GameContext, i: InvId) => [
  ...inv(game, i).hand,
  ...controlled(game, i)
    .filter((c) => !def(game, c.id).cannotLeavePlay)
    .map((c) => c.id),
];

export default {
  abilities: [{ kind: "revelation", run: "realm" }],
  fns: {
    realm(game: GameContext, run: ScriptRun) {
      const x = inv(game, run.you).horror;
      const total = yours(game, run.you).reduce((n, id) => n + cost(game, id), 0);
      const discards =
        x > 0 &&
        total >= x &&
        run.choose<boolean>(
          [
            {
              id: "discard",
              label: `Discard cards costing ${x} or more`,
              value: true,
              key: "option.dcaRealm.discard",
            },
            { id: "horror", label: "Take 2 horror", value: false, key: "option.dcaRealm.horror" },
          ],
          { text: "Realm of Madness", key: "dcaRealm" },
          { auto: false },
        );
      if (discards) queue(game, runScript({ code: CODE, fn: "discardOne", ctx: run.ctx, args: x }));
      else
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 2, direct: false, source: run.source }),
        );
    },
    /** one card more, until the costs discarded reach X */
    discardOne(game: GameContext, run: ScriptRun) {
      const left = asNumber(run.args) ?? 0;
      const mine = yours(game, run.you);
      if (!mine.length) return;
      const pick = run.chooseCard(mine, {
        text: `Discard a card (${left} more to discard)`,
        key: "dcaRealmCard",
      });
      const n = cost(game, pick);
      discard(game, pick);
      if (left - n > 0)
        queue(game, runScript({ code: CODE, fn: "discardOne", ctx: run.ctx, args: left - n }));
    },
  },
} satisfies CardScript;

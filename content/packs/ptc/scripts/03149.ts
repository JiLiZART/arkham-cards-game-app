// Charles Ross, Esq. — his controller may spend resources toward the [[Item]] assets other investigators at their
// location play; [fast] exhaust him: the next Item asset an investigator at your location plays costs 1 less (you
// choose that investigator)
import {
  card,
  type CardScript,
  def,
  type GameContext,
  type InstId,
  inv,
  type InvId,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "fast",
      label:
        "Charles Ross, Esq.: the next Item asset an investigator at your location plays costs 1 less",
      cost: { exhaust: true },
      effects: [
        {
          op: "modify",
          mod: { stat: "cost", value: -1, filter: { type: "asset", trait: "Item" } },
          // ponytail: "the next" has no end printed; the round's end bounds it
          until: "round",
          next: "play",
          target: "chooseAtLocation",
        },
      ],
    },
  ],
  paysFor(game: GameContext, cardId: InstId, i: InvId, played: InstId) {
    const me = card(game, cardId).controller;
    const d = def(game, played);
    return (
      !!me &&
      inv(game, me).location === inv(game, i).location &&
      d.type === "asset" &&
      d.traits.includes("Item")
    );
  },
} satisfies CardScript;

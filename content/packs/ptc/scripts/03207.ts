// Stalked by Shadows (A Phantom of Truth, act 2 v. II): once per round the group may spend 1 clue per investigator to
// place 1 doom on the current agenda or to evade The Organist automatically. Its objective is to survive three nights:
// agenda 3b sends here while Conviction leads. Back (Shepherd's Crook): Resolution 2 if you intruded on a secret
// meeting, else 1.
import {
  type CardScript,
  emit,
  exhaust,
  type GameContext,
  setEngaged,
  EVENT,
} from "../../../../src/engine/api";
import {
  lostLamb,
  organist,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

export default {
  abilities: [
    {
      kind: "fast",
      usableBy: "anyone",
      label: "Stalked by Shadows: spend 1 clue per investigator, as a group",
      cost: { cluesPerInvestigator: 1 },
      limit: { per: "round", count: 1, group: true },
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Place 1 doom on the current agenda",
              effects: [{ op: "placeDoom", amount: 1, on: "agenda" }, { op: "checkDoom" }],
            },
            {
              label: "Automatically evade The Organist",
              condition: { script: "organistInPlay" },
              effects: [{ op: "script", fn: "evadeHim" }],
            },
          ],
        },
      ],
    },
    { kind: "revelation", run: "lostLamb" },
  ],
  conditions: { organistInPlay: (game: GameContext) => !!organist(game) },
  fns: {
    /** "automatically evade The Organist": exhausted, and engaged with no one */
    evadeHim(game: GameContext) {
      const o = organist(game);
      if (!o) return;
      setEngaged(game, o.id, null);
      exhaust(game, o.id);
      emit(game, EVENT.Evade, "The Organist is evaded", { card: o.id });
    },
    lostLamb,
  },
} satisfies CardScript;

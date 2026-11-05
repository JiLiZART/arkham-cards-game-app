// Past, Present and Future (Lost in Time and Space, agenda 2) — its forced horror is the scenario's `encounterMove`;
// back: as agenda 1's, then, if names are recorded under "Sacrificed to Yog-Sothoth", each investigator tests
// willpower (X), X the number of names, and takes 1 damage per point failed
import {
  asStrings,
  campaignLogOf,
  type CardScript,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  turnOrder,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import { echoes } from "./02312";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      const found = echoes(game);
      const x = asStrings(campaignLogOf(game).sacrificed).length;
      const tests = x
        ? turnOrder(game)
            .filter((i) => inv(game, i).status === "playing")
            .map((i) =>
              resolveEffect({
                effect: {
                  op: "skillTest",
                  skill: "willpower",
                  difficulty: x,
                  perPointFailed: [{ op: "takeDamage", amount: 1 }],
                },
                ctx: { you: i, inv: i, source: null },
              }),
            )
        : [];
      queue(game, ...found, ...tests);
    },
  },
} satisfies CardScript;

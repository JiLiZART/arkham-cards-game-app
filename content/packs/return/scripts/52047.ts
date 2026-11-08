// Figure in the Shadows (Return to A Phantom of Truth) — Revelation: with as much Doubt as Conviction, The Organist
// moves 1 location away from the nearest investigator (to one with no investigators, if possible); with more
// Conviction, he resolves his hunter keyword (if he is ready and unengaged).
import {
  activeInvs,
  card,
  type CardScript,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  convictionLeads,
  organist,
  organistAway,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";
import { huntOnce } from "../../ptc/scripts/03086";

export default {
  abilities: [{ kind: "revelation", run: "figure" }],
  fns: {
    figure(game: GameContext, run: ScriptRun) {
      if (!convictionLeads(game)) return organistAway(game, run);
      const o = organist(game);
      if (o && !card(game, o.id).exhausted && !card(game, o.id).engagedWith)
        huntOnce(game, run, o.id, activeInvs(game));
    },
  },
} satisfies CardScript;

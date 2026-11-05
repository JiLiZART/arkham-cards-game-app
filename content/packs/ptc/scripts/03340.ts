// Possession (Traitorous) (Dim Carcosa): peril, hidden (data): it goes to the drawer's hand. With horror on you greater
// than twice your sanity you are eliminated and killed (as horror is placed, and the scenario checks after each action
// for one drawn while already past it). It may be committed to a skill test at your location: that test automatically
// fails (`commitAutoFails`, data).
import {
  activeInvs,
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  inv,
  type InvId,
  type ScriptRun,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";
import {
  overTwiceSanity,
  POSSESSION,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

const possessed = (game: GameContext, i: InvId) =>
  inv(game, i).hand.some((h) => POSSESSION.includes(card(game, h).code));

/** each investigator holding a Possession with horror greater than twice their sanity is killed */
export function possessionKills(game: GameContext) {
  for (const i of activeInvs(game))
    if (possessed(game, i) && overTwiceSanity(game, i))
      queue(game, defeatInvestigator({ inv: i, by: "effect", killed: true }));
}

/** the rule every Possession prints */
export const possession = {
  abilities: [
    {
      kind: "forced" as const,
      trigger: "horrorTaken" as const,
      condition: { script: "pastTwiceSanity" },
      run: "killed",
    },
  ],
  conditions: {
    pastTwiceSanity: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && ctx.inv === ctx.you && overTwiceSanity(game, ctx.you),
  },
  fns: {
    killed(game: GameContext, run: ScriptRun) {
      queue(game, defeatInvestigator({ inv: run.you, by: "effect", killed: true }));
    },
  },
};

export default possession satisfies CardScript;

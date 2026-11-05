// The Parisian Conspiracy, v. I (A Phantom of Truth, act 1; v. II shares its objective and its back's steps): advances by
// clues, or at the end of a round with 3 or more doom in play. Back (St. Barnabé): spent clues spawn The Organist
// (Draped in Mystery) at the lead's location; otherwise each investigator takes 2 horror and he spawns at the location
// farthest from all investigators.
import {
  activeInvs,
  type CardScript,
  type EffCtx,
  findByCode,
  type GameContext,
  inv,
  leadInvestigator,
  type ScriptRun,
  setCode,
  spawnTargets,
  ZONE,
  queue,
  advanceAct,
  dealDamage,
  spawn,
} from "../../../../src/engine/api";
import {
  DRAPED,
  doomInPlay,
  ORGANIST,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

/** the act's back: The Organist on `face`, at the lead's location when `nearLead`, else the farthest from everyone */
export function organistArrives(game: GameContext, ctx: EffCtx, face: string, nearLead: boolean) {
  const o = findByCode(game, ORGANIST, [ZONE.SetAside]);
  if (face !== ORGANIST && o) setCode(game, o.id, face);
  const lead = inv(game, leadInvestigator(game)).location;
  queue(
    game,
    ...(nearLead
      ? []
      : activeInvs(game).map((i) =>
          dealDamage({ inv: i, damage: 0, horror: 2, direct: false, source: ctx.source ?? null }),
        )),
    ...(!o
      ? []
      : nearLead && lead
        ? [spawn({ enemy: o.id, inv: null, at: lead })]
        : [
            spawn({
              enemy: o.id,
              inv: null,
              among: spawnTargets(game, { farthest: true, to: "investigators" }, null),
            }),
          ]),
  );
}

/** "At the end of the round, if there are 3 or more doom in play, advance." */
export const parisianObjective: CardScript = {
  abilities: [
    { kind: "forced", trigger: "roundEnds", condition: { script: "threeDoom" }, run: "advance" },
  ],
  conditions: { threeDoom: (game: GameContext) => doomInPlay(game) >= 3 },
  fns: { advance: (game: GameContext) => queue(game, advanceAct({ by: "doom" })) },
};

export default {
  abilities: [...parisianObjective.abilities!, { kind: "revelation", run: "stBarnabe" }],
  conditions: parisianObjective.conditions,
  fns: {
    ...parisianObjective.fns,
    stBarnabe(game: GameContext, run: ScriptRun) {
      organistArrives(game, run.ctx, DRAPED, run.ctx.actAdvancedBy !== "doom");
    },
  },
} satisfies CardScript;

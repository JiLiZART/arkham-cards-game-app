// Curtain Call (act 3) — what horror on a location became at act 2's back (flames, ooze, flood: each location with
// horror gains its forced ability, once per round for each location where it says so); at the end of the round horror
// spreads to each location with none connected to one with horror. While The Man in the Pallid Mask is not in play
// the Lobby can be resigned from (the Lobby's script). Return to Curtain Call's versions add mists ("when you would
// leave": willpower 3, cancel the move or lose your remaining actions), overgrowth ("after you leave": willpower 4,
// discard an Item or Ally asset or take 2 damage) and screeching (as flames, willpower 2 for 1 horror). The objective, each undefeated investigator resigned, is the
// scenario's; back: the investigators decide (→R1) or (→R2).
import {
  card,
  type CardScript,
  connections,
  currentRound,
  type EffCtx,
  flags,
  type GameContext,
  type InstId,
  inv,
  locations,
  type ScriptRun,
  queue,
  endScenario,
  resolveEffect,
} from "../../../../src/engine/api";
import { horrorOn } from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";
import { spreading } from "./03047a";

const hasHorror = (game: GameContext, loc: InstId | null | undefined) =>
  !!loc && card(game, loc).horror > 0;
/** a location's gained ability, once per round */
const usedKey = (game: GameContext, loc: InstId) => `ccUsed:${loc}:${currentRound(game)}`;
const fresh = (game: GameContext, loc: InstId) => !flags.named(game, usedKey(game, loc));
const where = (game: GameContext, ctx: EffCtx) =>
  ctx.location ?? (ctx.inv ? inv(game, ctx.inv).location : null);

export default {
  abilities: [
    // flames: after you enter this location or end your turn at it
    { kind: "forced", trigger: "enterLocation", condition: { script: "flames" }, run: "burn" },
    { kind: "forced", trigger: "turnEnds", condition: { script: "flames" }, run: "burn" },
    // ooze: after you leave this location
    {
      kind: "forced",
      trigger: "leftLocation",
      condition: { script: "ooze" },
      effects: [
        {
          op: "skillTest",
          skill: "agility",
          difficulty: 4,
          onFail: [
            { op: "takeHorror", amount: 1 },
            { op: "takeDamage", amount: 1 },
          ],
        },
      ],
    },
    // flood: when you would leave this location
    { kind: "forced", trigger: "wouldMoveOut", condition: { script: "flood" }, run: "flood" },
    // mists: when you would leave this location
    {
      kind: "forced",
      trigger: "wouldMoveOut",
      condition: { script: "mists" },
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 3,
          onFail: [{ op: "script", fn: "lost" }],
        },
      ],
    },
    // overgrowth: after you leave this location
    {
      kind: "forced",
      trigger: "leftLocation",
      condition: { script: "overgrowth" },
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 4,
          onFail: [
            {
              op: "discardAsset",
              filter: { trait: ["Item", "Ally"] },
              orElse: [{ op: "takeDamage", amount: 2 }],
            },
          ],
        },
      ],
    },
    // screeching: after you enter this location or end your turn at it
    {
      kind: "forced",
      trigger: "enterLocation",
      condition: { script: "screeching" },
      run: "screech",
    },
    { kind: "forced", trigger: "turnEnds", condition: { script: "screeching" }, run: "screech" },
    { kind: "forced", trigger: "roundEnds", run: "spread" },
    { kind: "revelation", run: "back" },
  ],
  conditions: {
    flames: (game: GameContext, ctx: EffCtx) => {
      const loc = where(game, ctx);
      return spreading(game) === "flames" && hasHorror(game, loc) && fresh(game, loc!);
    },
    ooze: (game: GameContext, ctx: EffCtx) =>
      spreading(game) === "ooze" && hasHorror(game, ctx.location),
    flood: (game: GameContext, ctx: EffCtx) =>
      spreading(game) === "flood" && hasHorror(game, ctx.location) && fresh(game, ctx.location!),
    mists: (game: GameContext, ctx: EffCtx) =>
      spreading(game) === "mists" && hasHorror(game, ctx.location),
    overgrowth: (game: GameContext, ctx: EffCtx) =>
      spreading(game) === "overgrowth" && hasHorror(game, ctx.location),
    screeching: (game: GameContext, ctx: EffCtx) => {
      const loc = where(game, ctx);
      return spreading(game) === "screeching" && hasHorror(game, loc) && fresh(game, loc!);
    },
  },
  fns: {
    burn(game: GameContext, run: ScriptRun) {
      const loc = where(game, run.ctx);
      if (!loc) return;
      flags.setNamed(game, usedKey(game, loc), true);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "agility",
            difficulty: 3,
            onFail: [{ op: "takeDamage", amount: 1 }],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    /** "Test [willpower] (2). If you fail, take 1 horror. (Limit once per round.)" */
    screech(game: GameContext, run: ScriptRun) {
      const loc = where(game, run.ctx);
      if (!loc) return;
      flags.setNamed(game, usedKey(game, loc), true);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 2,
            onFail: [{ op: "takeHorror", amount: 1 }],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    /** "you must either cancel the effects of the move or lose all remaining actions and end your turn after completing
     * the effects of the move" (with no action left the turn ends once the move is done) */
    lost(game: GameContext, run: ScriptRun) {
      const id = run.choose<string>(
        [
          { id: "cancel", label: "Cancel the move", value: "cancel", key: "option.ccMists.cancel" },
          {
            id: "lose",
            label: "Lose all remaining actions and end your turn after the move",
            value: "lose",
            key: "option.ccMists.lose",
          },
        ],
        { text: "The mist: cancel the move, or lose your remaining actions", key: "ccMists" },
        { auto: false },
      );
      queue(
        game,
        resolveEffect({
          effect: id === "cancel" ? { op: "cancel" } : { op: "loseActions", amount: "all" },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    flood(game: GameContext, run: ScriptRun) {
      if (!run.ctx.location) return;
      flags.setNamed(game, usedKey(game, run.ctx.location), true);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "agility",
            difficulty: 2,
            onFail: [{ op: "takeDamage", amount: 1 }, { op: "cancel" }],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    /** "Place 1 horror on each location with no horror that is connected to a location with horror" */
    spread(game: GameContext) {
      const burning = locations(game).filter((l) => l.horror > 0);
      const next = locations(game).filter(
        (l) => !l.horror && connections(game, l.id).some((c) => burning.some((b) => b.id === c)),
      );
      for (const l of next) horrorOn(game, l.id);
    },
    /** "The investigators must decide": the lead answers for the group */
    back(game: GameContext, run: ScriptRun) {
      const id = run.choose<string>(
        [
          {
            id: "R1",
            label: "We have to warn the police about what's going on! (→R1)",
            value: "R1",
            key: "option.ccWarnPolice",
          },
          {
            id: "R2",
            label: "The police won't believe us. We have to solve this mystery on our own. (→R2)",
            value: "R2",
            key: "option.ccSolveAlone",
          },
        ],
        { text: "The investigators must decide", key: "ccWarnPolice" },
        { auto: false },
      );
      queue(game, endScenario({ id }));
    },
  },
} satisfies CardScript;

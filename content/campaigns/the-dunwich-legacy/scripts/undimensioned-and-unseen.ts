// Undimensioned and Unseen: one version of each of the six locations at random; the Brood of Yog-Sothoth in play and
// set aside by how many were sacrificed to Yog-Sothoth; the Powder of Ibn-Ghazi from the deck into play. The scenario's
// moves: a random location (the other versions drawn at random: one location in play at random, the reaction of the
// second Cold Spring Glen able to choose again), each Brood moving toward one, a Brood spawning at one; the clues the
// locations let the investigators place on an Abomination; act 2's objective; and, as it ends, the Brood that escaped.
import {
  argField,
  asNumber,
  asString,
  asStrings,
  campaignLogOf,
  canEnemyEnter,
  card,
  cardIf,
  type CardScript,
  connections,
  currentAct,
  def,
  emit,
  enemies,
  enemiesAt,
  EVENT,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invsAt,
  leadInvestigator,
  locations,
  moveCard,
  queue,
  randomLocation,
  resolveEffect,
  runScript,
  type ScriptRun,
  setCardLocation,
  setController,
  setCounter,
  addCounter,
  cardsIn,
  shuffleList,
  spawn,
  startTest,
  stepsToward,
  turnOrder,
  advanceAct,
  currentRound,
  ZONE,
} from "../../../../src/engine/api";
import { powderClues } from "../../../packs/dwl/scripts/02219";

export const SCENARIO = "undimensioned-and-unseen";
export const BROOD = "02255";
const POWDER = "02219";
const GLEN_REACTS = "02245";
/** the two versions of each location: one into play at random, the other out of the game */
const PAIRS = [
  ["02242", "02243"], // Dunwich Village
  ["02244", "02245"], // Cold Spring Glen
  ["02246", "02247"], // Ten-Acre Meadow
  ["02248", "02249"], // Blasted Heath
  ["02250", "02251"], // Whateley Ruins
  ["02252", "02253"], // Devil's Hop Yard
];
/** the campaign log count the flow reads: the Brood in play or set aside as the scenario ends */
export const BROOD_ESCAPED = ["campaign_notes", "broodEscaped"] as const;

const isBrood = (game: GameContext, id: InstId) => card(game, id).code === BROOD;
const isAbomination = (game: GameContext, id: InstId) =>
  def(game, id).traits.includes("Abomination");
/** the Brood in play */
export const broods = (game: GameContext): InstId[] =>
  enemies(game)
    .filter((e) => isBrood(game, e.id))
    .map((e) => e.id);
/** the Brood set aside, out of play */
export const broodsAside = (game: GameContext): InstId[] =>
  cardsIn(game, ZONE.SetAside)
    .filter((c) => c.code === BROOD)
    .map((c) => c.id);
const locationNamed = (game: GameContext, name: string) =>
  locations(game).find((l) => def(game, l.id).name === name)?.id;

/** a script function's object argument, copied (a continuation passes it on) */
const argsOf = (run: ScriptRun): Record<string, unknown> =>
  typeof run.args === "object" && run.args !== null ? { ...run.args } : {};
/** the next scenario function, after the steps queued before it */
const next = (game: GameContext, fn: string, args: Record<string, unknown>, you?: InvId) =>
  runScript({
    code: SCENARIO,
    fn,
    ctx: { you: you ?? leadInvestigator(game), source: null },
    args,
  });

/** choose a random location, then run `after` with it as `at` (and the other args) */
export const atRandom = (game: GameContext, after: string, args: Record<string, unknown> = {}) =>
  next(game, "uauRandom", { ...args, after });

/** an enemy moves once toward a location, if it can enter the next one */
function moveToward(game: GameContext, enemy: InstId, to: InstId, why: string) {
  const from = card(game, enemy).location;
  if (!from || from === to) return;
  const step = stepsToward(game, from, [to]).find((l) => canEnemyEnter(game, enemy, l));
  if (!step) return;
  setCardLocation(game, enemy, step);
  emit(game, EVENT.EnemyMove, `${def(game, enemy).name} moves ${why}`, {
    card: enemy,
    data: { from, to: step },
  });
}

/** whose clues an Abomination gets: theirs who used the ability, then the others' here; 1 each with `each` */
function giveClues(game: GameContext, you: InvId, n: number, from: string) {
  if (from === "bank") return;
  const here = inv(game, you).location;
  const givers =
    from === "you"
      ? [you]
      : [you, ...turnOrder(game).filter((i) => i !== you && invsAt(game, here).includes(i))];
  for (const i of givers) {
    const take = Math.min(n, inv(game, i).clues, from === "each" ? 1 : Infinity);
    addCounter(game, i, "clues", -take);
    n -= take;
  }
}
/** how many clues can be given: yours, the group's here, one per investigator here with any, or the bank's */
function cluesToGive(game: GameContext, you: InvId, from: string): number {
  const here = invsAt(game, inv(game, you).location);
  if (from === "you") return inv(game, you).clues;
  if (from === "group") return here.reduce((n, i) => n + inv(game, i).clues, 0);
  if (from === "each") return here.filter((i) => inv(game, i).clues > 0).length;
  return Infinity;
}
const abominationsHere = (game: GameContext, you: InvId) =>
  enemiesAt(game, inv(game, you).location)
    .filter((e) => isAbomination(game, e.id))
    .map((e) => e.id);

/**
 * What the scenario's cards run by name (their data's `script` effects and conditions): given to their card scripts too,
 * so they work in any scenario that plays these cards (Return to Undimensioned and Unseen).
 */
export const SHARED = {
  fns: {
    /** a random location (none of `exclude`); the second Cold Spring Glen may react to being chosen */
    uauRandom(game: GameContext, run: ScriptRun) {
      const args = argsOf(run);
      const at = randomLocation(game, asStrings(args.exclude));
      if (!at) return;
      const glen = card(game, at).code === GLEN_REACTS && invsAt(game, at).length > 0;
      queue(game, next(game, glen ? "uauGlen" : asString(args.after)!, { ...args, at }));
    },
    /** "After Cold Spring Glen is chosen as a random location: an investigator in it tests agility (3); if successful,
     * choose a different random location" */
    uauGlen(game: GameContext, run: ScriptRun) {
      const args = argsOf(run);
      const glen = asString(args.at)!;
      const here = invsAt(game, glen);
      const who = run.choose<InvId | null>(
        [
          ...here.map((i) => ({
            id: i,
            label: `${inv(game, i).name} tests agility (3)`,
            value: i,
            card: inv(game, i).cardId,
            key: "option.glenTest",
            vars: { inv: i },
          })),
          { id: "no", label: "Let it be", value: null, key: "option.glenNoTest" },
        ],
        {
          text: "Cold Spring Glen was chosen at random: test agility (3) to choose again?",
          key: "glenChosen",
        },
        { who: here[0], auto: false },
      );
      if (!who) {
        queue(game, next(game, asString(args.after)!, args));
        return;
      }
      startTest(game, {
        inv: who,
        skill: "agility",
        kind: "plain",
        difficulty: 3,
        source: glen,
        onSuccess: [
          {
            op: "script",
            fn: "uauRandom",
            args: { ...args, exclude: [...asStrings(args.exclude), glen] },
          },
        ],
        onFail: [{ op: "script", fn: asString(args.after)!, args }],
        ctx: { you: who, source: glen },
      });
    },
    /** each Brood moves once toward a random location of its own (the agendas' forced effect) */
    uauRampage(game: GameContext) {
      const steps = broods(game).map((enemy) => atRandom(game, "uauMoveToward", { enemy }));
      if (steps.length) queue(game, ...steps);
    },
    uauMoveToward(game: GameContext, run: ScriptRun) {
      const args = argsOf(run);
      const enemy = asString(args.enemy)!;
      if (cardIf(game, enemy)?.zone !== ZONE.Enemy) return;
      moveToward(game, enemy, asString(args.at)!, "toward a random location");
    },
    /** a set-aside Brood spawns at `at`, if one is left */
    uauSpawnBrood(game: GameContext, run: ScriptRun) {
      const brood = broodsAside(game)[0];
      const at = asString(argField(run.args, "at"));
      if (!brood || !at) return;
      moveCard(game, brood, ZONE.Limbo);
      queue(game, spawn({ enemy: brood, inv: null, at }));
    },
    /** the tablet: all the clues off a Brood in play */
    uauClearBrood(game: GameContext, run: ScriptRun) {
      const withClues = broods(game).filter((id) => card(game, id).clues > 0);
      if (!withClues.length) return;
      const brood = run.chooseCard(withClues, {
        text: "Choose a Brood of Yog-Sothoth to remove its clues",
        key: "clearBrood",
      });
      setCounter(game, brood, "clues", 0);
    },
    /** a location's lure: clues from you, the group here, each investigator here or the bank, onto an Abomination */
    uauLure(game: GameContext, run: ScriptRun) {
      const args = argsOf(run);
      const pool = args.anywhere
        ? enemies(game)
            .filter((e) => isAbomination(game, e.id))
            .map((e) => e.id)
        : abominationsHere(game, run.you);
      if (!pool.length) return;
      const enemy = run.chooseCard(pool, {
        text: "Choose an Abomination to place clues on",
        key: "lureAbomination",
      });
      queue(game, next(game, "uauLureAmount", { ...args, enemy }, run.you));
    },
    uauLureAmount(game: GameContext, run: ScriptRun) {
      const args = argsOf(run);
      const enemy = asString(args.enemy)!;
      const from = asString(args.from) ?? "you";
      const most = Math.min(asNumber(args.max) ?? 1, cluesToGive(game, run.you, from));
      if (most <= 0 || cardIf(game, enemy)?.zone !== ZONE.Enemy) return;
      const n = run.choose<number>(
        Array.from({ length: most }, (_, k) => ({
          id: String(k + 1),
          label: `${k + 1} clue${k ? "s" : ""}`,
          value: k + 1,
          key: "option.clueCount",
          vars: { n: k + 1 },
        })),
        { text: "How many clues to place?", key: "lureClues" },
      );
      giveClues(game, run.you, n, from);
      addCounter(game, enemy, "clues", n);
      emit(game, EVENT.Clues, `${n} clue(s) placed on ${def(game, enemy).name}`, {
        inv: run.you,
        card: enemy,
        data: { n },
      });
      // Ten-Acre Meadow's rain: 1 of them comes off at the end of the round
      if (args.rain) flags.setNamed(game, `uauRain:${currentRound(game)}:${enemy}`, true);
    },
    /** Ten-Acre Meadow: at the end of the round, 1 clue off the enemy the rain fell on */
    uauRainEnds(game: GameContext) {
      for (const id of enemies(game).map((e) => e.id))
        if (flags.named(game, `uauRain:${currentRound(game)}:${id}`) && card(game, id).clues > 0)
          addCounter(game, id, "clues", -1);
    },
    /** Dunwich Village: a Brood moves once toward it */
    uauPullBrood(game: GameContext, run: ScriptRun) {
      const pool = broods(game);
      if (!pool.length) return;
      const brood = run.chooseCard(pool, {
        text: "Choose a Brood of Yog-Sothoth to move toward Dunwich Village",
        key: "pullBrood",
      });
      moveToward(game, brood, run.source, "toward Dunwich Village");
    },
    /** Whateley Ruins: a Brood moves 1 location in any direction */
    uauShoveBrood(game: GameContext, run: ScriptRun) {
      const pool = broods(game).filter((id) =>
        connections(game, card(game, id).location!).some((l) => canEnemyEnter(game, id, l)),
      );
      if (!pool.length) return;
      const enemy = run.chooseCard(pool, {
        text: "Choose a Brood of Yog-Sothoth to move",
        key: "shoveBrood",
      });
      queue(game, next(game, "uauShoveTo", { enemy }, run.you));
    },
    uauShoveTo(game: GameContext, run: ScriptRun) {
      const enemy = asString(argField(run.args, "enemy"))!;
      const from = card(game, enemy).location!;
      const to = run.chooseCard(
        connections(game, from).filter((l) => canEnemyEnter(game, enemy, l)),
        { text: "Choose where it moves", key: "shoveBroodTo" },
      );
      setCardLocation(game, enemy, to);
      emit(game, EVENT.EnemyMove, `${def(game, enemy).name} moves`, {
        card: enemy,
        data: { from, to },
      });
    },
  },
  conditions: {
    /** a Brood in play with clues on it (the tablet's "remove all clues" can be done) */
    uauBroodWithClues: (game: GameContext) => broods(game).some((id) => card(game, id).clues > 0),
    /** an Abomination here and clues of yours */
    uauLureMine: (game: GameContext, ctx) =>
      !!ctx.you && inv(game, ctx.you).clues > 0 && abominationsHere(game, ctx.you).length > 0,
    /** an Abomination here and clues among the investigators here */
    uauLureOurs: (game: GameContext, ctx) =>
      !!ctx.you &&
      abominationsHere(game, ctx.you).length > 0 &&
      invsAt(game, inv(game, ctx.you).location).some((i) => inv(game, i).clues > 0),
    /** an Abomination in play and clues of yours */
    uauLureAnywhere: (game: GameContext, ctx) =>
      !!ctx.you &&
      inv(game, ctx.you).clues > 0 &&
      enemies(game).some((e) => isAbomination(game, e.id)),
  },
} satisfies CardScript;

export default {
  fns: {
    uauSetup(game: GameContext) {
      // one version of each location into play, the other out of the game
      for (const pair of PAIRS) {
        const p = [...pair];
        shuffleList(game, p);
        moveCard(game, findByCode(game, p[0], [ZONE.SetAside])!.id, ZONE.Location);
        moveCard(game, findByCode(game, p[1], [ZONE.SetAside])!.id, ZONE.Removed);
      }
      // the Brood by the names sacrificed to Yog-Sothoth: [in play, set aside]; the rest out of the game
      const sacrificed = asStrings(campaignLogOf(game).sacrificed).length;
      const [inPlay, aside] =
        sacrificed <= 1 ? [2, 3] : sacrificed === 2 ? [1, 3] : sacrificed === 3 ? [1, 2] : [0, 2];
      const all = broodsAside(game);
      const at = [locationNamed(game, "Cold Spring Glen"), locationNamed(game, "Blasted Heath")];
      all.slice(0, inPlay).forEach((id, k) => {
        moveCard(game, id, ZONE.Limbo);
        queue(game, spawn({ enemy: id, inv: null, at: at[k] }));
      });
      for (const id of all.slice(inPlay + aside)) moveCard(game, id, ZONE.Removed);
      // the Powder of Ibn-Ghazi, from a deck into play
      for (const i of turnOrder(game)) {
        const powder = cardsIn(game, ZONE.Deck).find((c) => c.code === POWDER && c.owner === i);
        if (!powder) continue;
        moveCard(game, powder.id, ZONE.Play);
        setController(game, powder.id, i);
        setCounter(game, powder.id, "clues", powderClues(game));
      }
    },
    ...SHARED.fns,
  },
  conditions: SHARED.conditions,
  hooks: {
    checkObjectives(game: GameContext) {
      // act 2: "If there are no copies of Brood of Yog-Sothoth in play or set aside, advance"
      if (cardIf(game, currentAct(game))?.code !== "02241") return;
      if (!broods(game).length && !broodsAside(game).length) queue(game, advanceAct());
    },
    ended(game: GameContext) {
      // "X brood escaped into the wild": the Brood still in play or set aside
      flags.countEntry.set(game, BROOD_ESCAPED, broods(game).length + broodsAside(game).length);
    },
  },
} satisfies CardScript;

/** Biding Its Time's back: a set-aside Brood spawns at the lead's location; those there test agility (4) or it attacks */
export function noPlaceToHide(game: GameContext) {
  const brood = broodsAside(game)[0];
  const at = inv(game, leadInvestigator(game)).location;
  if (!brood || !at) return;
  moveCard(game, brood, ZONE.Limbo);
  queue(
    game,
    spawn({ enemy: brood, inv: null, at }),
    ...invsAt(game, at).map((i) =>
      resolveEffect({
        effect: {
          op: "skillTest",
          skill: "agility",
          difficulty: 4,
          onFail: [{ op: "enemyAttack", enemy: "eventEnemy" }],
        },
        ctx: { you: i, inv: i, enemy: brood, source: null },
      }),
    ),
  );
}

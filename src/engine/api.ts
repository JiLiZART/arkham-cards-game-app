/**
 * What card and scenario scripts (content/**\/scripts) may import, by name. Scripts read the game through the
 * accessors and queries below, change it through the setters, and queue engine steps only through the intent verbs
 * and `queue`: the step union is the engine's own, so no script names a step kind or a step's fields.
 */
import { push, type GameContext } from "./context";
import { STEP } from "./steps/step";
import type { BeneathOf, TokenHolder, Trigger } from "../content/schema";
import type { EffCtx, EventData, InstId, InvId, ScriptHooks, Step } from "./world/types";

// ---------- reading the game ----------
export {
  activeInvs,
  allCards,
  campaignLogOf,
  card,
  cardIf,
  currentAct,
  currentActs,
  currentAgenda,
  currentAgendas,
  deckCards,
  cardsBeneath,
  tokensOn,
  inVehicle,
  currentPhase,
  currentRound,
  currentTest,
  def,
  difficultyOf,
  inv,
  invIf,
  invName,
  leadInvestigator,
  pile,
  playerCount,
  sideDeck,
  turnOrder,
} from "./context";
export {
  abilitiesOf,
  canPay,
  cardsIn,
  checkCondition,
  connections,
  controlled,
  distances,
  enemies,
  enemiesAt,
  enemyStat,
  findByCode,
  invsAt,
  isElite,
  locationByName,
  locations,
  remainingHealth,
  remainingSanity,
  shroud,
  spendableGroupClues,
  stepsToward,
  threatArea,
  uniqueInPlay,
} from "./queries";
export { canPlay, playCost } from "./rules/cards";
export { attackKey, canEnemyEnter } from "./rules/enemies";
export { canCommit } from "./rules/skillTest";
export { resolvesOnDraw } from "./rules/investigators";

// ---------- changing the game ----------
export {
  addChaosTokens,
  addCounter,
  cancelEvent,
  emit,
  placeInvestigator,
  randomInt,
  ready,
  setCardLocation,
  setCode,
  setController,
  setCounter,
  setEngaged,
  setOwner,
  shuffleDeck,
  shuffleList,
} from "./context";
export { createCard, discard, moveCard, putBeneath, putOnTop, shuffleIntoDeck } from "./movement";
export { bondedOf, isHidden, keywordArg, spawnTargets, swarmOf } from "./queries";
export { addTempMod } from "./queries";
export {
  addExtraReveal,
  flipNegativeTokens,
  forceResult,
  setOnChoose,
  startTest,
} from "./rules/skillTest";
export { resolveWeakness } from "./rules/investigators";
export * as flags from "./world/flags";

// ---------- choices outside a script function (a shared helper given the run's step) ----------
export { ask } from "./context";

// ---------- a script's own continuation arguments, narrowed ----------
export { argField, asNumber, asString, asStrings } from "./rules/scripts";

// ---------- closed sets ----------
export { EVENT } from "./events/event";
export { CHOICE, PHASE, ZONE } from "./world/constants";

// ---------- types ----------
export type {
  CardScript,
  EffCtx,
  GameContext,
  HookRun,
  InstId,
  InvId,
  ScriptRun,
} from "./world/types";

// ---------- intent verbs: what scripts queue on the stack ----------
declare const QUEUED: unique symbol;
/** an engine step a verb built, for `queue`; scripts can't look inside it */
export type Queued = { readonly [QUEUED]: true };
type StepOf<K extends Step["t"]> = Omit<Extract<Step, { t: K }>, "t" | "choice">;
const verb =
  <K extends Step["t"]>(t: K) =>
  (args: StepOf<K>): Queued =>
    ({ t, ...args }) as unknown as Queued;
const bare =
  <K extends Step["t"]>(t: K) =>
  (): Queued =>
    ({ t }) as unknown as Queued;

/** put steps on the stack: the first given resolves first */
export const queue = (game: GameContext, ...steps: Queued[]) =>
  push(game, ...(steps as unknown as Step[]));

/** a script function, after the steps before it (a script's own continuation) */
export const runScript = verb(STEP.Script);
export const spawn = verb(STEP.Spawn);
/** damage and horror to assign: an investigator (and their assets, unless direct) */
export const dealDamage = verb(STEP.AssignDamage);
export const resolveEffects = verb(STEP.Effects);
export const resolveEffect = verb(STEP.Eff);
export const advanceAct = (args: StepOf<"AdvanceAct"> = {}): Queued => verb(STEP.AdvanceAct)(args);
export const placeDoom = verb(STEP.PlaceDoom);
/** the scenario ends with this resolution */
export const endScenario = verb(STEP.Resolution);
export const drawCards = verb(STEP.Draw);
export const checkDoom = bare(STEP.CheckDoom);
export const resolveRevelation = verb(STEP.Revelation);
export const enemyAttacks = verb(STEP.EnemyAttack);
export const discoverClues = verb(STEP.DiscoverClues);
export const damageEnemy = verb(STEP.DamageEnemy);
export const defeatInvestigator = verb(STEP.Defeated);
export const playCard = verb(STEP.PlayCard);
export const useAbility = verb(STEP.UseAbility);
export const moveInvestigator = verb(STEP.Move);
export const defeatEnemy = verb(STEP.DefeatEnemy);
export const checkObjectives = bare(STEP.CheckObjectives);
/** turn a card to its other printed face, keeping what is on it (engine-scenario-structure) */
export const flip = (card: InstId): Queued => verb(STEP.Flip)({ card });
/** resolve a story face: shown, its abilities run, then what the card says */
export const resolveStory = verb(STEP.ResolveStory);
/** the top card beneath a card (or one at random) drawn by `ctx.you` as an encounter card */
export const drawBeneath = (from: BeneathOf, ctx: EffCtx, random?: boolean): Queued =>
  verb(STEP.Eff)({ effect: { op: "drawBeneath", from, ...(random ? { random } : {}) }, ctx });
/** a location leaves play: its investigators defeated (or moved `to`), its enemies discarded, the scenario told */
export const removeLocation = verb(STEP.RemoveLocation);
/** a card leaves play to the void, keeping its attachments and tokens */
export const toVoid = (card: InstId): Queued =>
  verb(STEP.Eff)({ effect: { op: "toVoid" }, ctx: { source: card } });
/** a card of this code comes back from the void: an enemy spawns */
export const fromVoid = (code: string, ctx: EffCtx): Queued =>
  verb(STEP.Eff)({ effect: { op: "fromVoid", code }, ctx });
/** named tokens (wards, scrap) placed on this card, on you or on your location */
export const placeTokens = (name: string, amount: number, on: TokenHolder, ctx: EffCtx): Queued =>
  verb(STEP.Eff)({ effect: { op: "placeTokens", on, name, amount }, ctx });
/** an investigator gets into a vehicle at their location, or out of the one they are in */
export const enterVehicle = verb(STEP.EnterVehicle);
export const leaveVehicle = verb(STEP.LeaveVehicle);
/** a vehicle moves, the investigators in it with it */
export const moveVehicle = verb(STEP.MoveVehicle);
/** the scenario pauses on one of its interludes; the lead answers it */
export const readInterlude = (id: string): Queued => verb(STEP.ReadInterlude)({ id });
/** the top `amount` cards of `ctx.you`'s deck beneath the enemy (`ctx.enemy`, else `ctx.source`) as swarm cards */
export const addSwarm = (amount: number, ctx: EffCtx): Queued =>
  verb(STEP.Eff)({ effect: { op: "addSwarm", amount }, ctx });
/** this card leaves the game and its owner's campaign deck */
export const exile = (card: InstId): Queued =>
  verb(STEP.Eff)({ effect: { op: "exile" }, ctx: { source: card } });
/** the top card beneath a card turned faceup */
export const revealBeneath = (from: BeneathOf, ctx: EffCtx): Queued =>
  verb(STEP.Eff)({ effect: { op: "revealBeneath", from }, ctx });
/** a reaction window on `trigger` (an event the engine didn't raise itself) */
export const openWindow = (trigger: Trigger, data: EventData): Queued =>
  ({ t: STEP.Window, trigger, data }) as unknown as Queued;
/** reveal a location once the steps before it have resolved */
export const revealLocation = (location: InstId): Queued => verb(STEP.RevealLocation)({ location });
/** an investigator's assets with enough damage or horror on them are defeated */
export const checkAssetDefeat = (inv: InvId): Queued => verb(STEP.AssetDefeatCheck)({ inv });
/** the basic Fight action against the context's enemy */
export const basicFight = (ctx: EffCtx): Queued => verb(STEP.BasicFight)({ ctx });

// ---------- a Return-to scenario's script over its base's ----------
/**
 * The hooks of a Return-to scenario: its base's and its own together. `setup` and the card hooks run base then extra;
 * `checkObjectives` and `ended` run extra then base; `spawnRedirect` takes extra's answer, else base's; `healHorror`
 * lowers the heal through both.
 */
export function compose(
  base: Partial<ScriptHooks>,
  extra: Partial<ScriptHooks>,
): Partial<ScriptHooks> {
  const out: Partial<ScriptHooks> = { ...base, ...extra };
  const both = <K extends "setup" | "gameEnd" | "eventFinished" | "allEliminated">(k: K) => {
    const a = base[k] as ((...x: unknown[]) => void) | undefined;
    const b = extra[k] as ((...x: unknown[]) => void) | undefined;
    if (a && b) out[k] = ((...x: unknown[]) => (a(...x), b(...x))) as ScriptHooks[K];
  };
  both("setup");
  both("gameEnd");
  both("eventFinished");
  both("allEliminated");
  const { checkObjectives: bc, ended: be, spawnRedirect: bs, healHorror: bh } = base;
  const { checkObjectives: xc, ended: xe, spawnRedirect: xs, healHorror: xh } = extra;
  if (bc && xc) out.checkObjectives = (game) => (xc(game), bc(game));
  if (be && xe) out.ended = (game, won) => (xe(game, won), be(game, won));
  if (bs && xs) out.spawnRedirect = (game, enemy) => xs(game, enemy) ?? bs(game, enemy);
  if (bh && xh)
    out.healHorror = (game, run, target, n) => xh(game, run, target, bh(game, run, target, n));
  return out;
}

/**
 * What card and scenario scripts (content/**\/scripts) may import, by name. Scripts read the game through the
 * accessors and queries below, change it through the setters, and queue engine steps only through the intent verbs
 * and `queue`: the step union is the engine's own, so no script names a step kind or a step's fields.
 */
import { push, type GameContext } from "./context";
import { STEP } from "./steps/step";
import type { Trigger } from "../content/schema";
import type { EffCtx, EventData, InstId, InvId, Step } from "./world/types";

// ---------- reading the game ----------
export {
  activeInvs,
  allCards,
  campaignLogOf,
  card,
  cardIf,
  currentAct,
  currentAgenda,
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
export { createCard, discard, moveCard, putOnTop, shuffleIntoDeck } from "./movement";
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
/** a reaction window on `trigger` (an event the engine didn't raise itself) */
export const openWindow = (trigger: Trigger, data: EventData): Queued =>
  ({ t: STEP.Window, trigger, data }) as unknown as Queued;
// engine functions a script queues after its own steps (typed step kinds in engine-typed-continuations)
const engineFn = (fn: string, ctx: EffCtx): Queued =>
  ({ t: STEP.Script, code: "__engine", fn, ctx }) as unknown as Queued;
/** reveal a location once the steps before it have resolved */
export const revealLocation = (location: InstId) => engineFn("revealLocation", { location });
/** an investigator's assets with enough damage or horror on them are defeated */
export const checkAssetDefeat = (you: InvId) => engineFn("assetDefeatCheck", { you });
/** the basic Fight action against `enemy` */
export const basicFight = (ctx: { you: InvId; enemy?: InstId | null }) =>
  engineFn("basicFight", ctx);

import type { EventType } from "../events/event";
import type { ChoiceKind, FixedPile, InvStatus, Phase, TestStage, Zone } from "./constants";

export type { ChoiceKind, InvStatus, Phase, TestStage, Zone } from "./constants";
import type {
  Ability,
  Boost,
  CampaignDef,
  CampaignFlow,
  CardDef,
  ChaosToken,
  ContentCoverage,
  DeckDef,
  Difficulty,
  Effect,
  I18nCampaigns,
  InvestigatorDef,
  Modifier,
  ScenarioDef,
  Skill,
  SoundManifest,
  Trigger,
} from "../../content/schema";

export type InstId = string;
export type InvId = string;

export interface CardInst {
  id: InstId;
  code: string;
  owner: InvId | null;
  controller: InvId | null;
  zone: Zone;
  exhausted: boolean;
  revealed: boolean;
  damage: number;
  horror: number;
  clues: number;
  doom: number;
  uses: number;
  resources: number;
  /** enemies: location; attachments: location they are attached to */
  location: InstId | null;
  engagedWith: InvId | null;
  /** cards attached to another card (not location) */
  attachedTo: InstId | null;
}

/** an investigator's record in the store: everything but the piles, which live in the world's pile map */
export type InvRecord = Omit<InvState, "deck" | "hand" | "discard">;

/** the name of a pile: an investigator's deck, hand or discard, or one of the scenario's */
export type PileName =
  | `deck:${string}`
  | `hand:${string}`
  | `discard:${string}`
  | `sideDeck:${string}`
  | `actDeck:${string}`
  | `agendaDeck:${string}`
  /** the facedown cards beneath a card, top first */
  | `beneath:${string}`
  | FixedPile;

/**
 * The store (ADR-0023): the entities in creation order, one table per component, and every pile in one map keyed by
 * its name. A card sits in at most one pile, the one its zone and owner name. Plain JSON.
 */
export interface World {
  entities: InstId[];
  tables: CardTables &
    FlagTables & {
      /** a card's identity: every card has one */
      card: Record<InstId, CardIdentity>;
      investigator: Record<InvId, InvRecord>;
    };
  piles: Partial<Record<PileName, InstId[]>>;
}

/**
 * One table per flag family about an entity (ADR-0024), keyed by the entity: a card, an investigator, or for the
 * enemy-and-investigator families `enemy:investigator`. Set and read through `flags.ts`.
 */
export interface FlagTables {
  noReady: Record<InstId, true>;
  surge: Record<InstId, true>;
  dying: Record<InstId, true>;
  costMod: Record<InstId, number>;
  /** named tokens (wards, scrap, seals) by `holder:name`: the holder a card or an investigator */
  tokens: Record<string, number>;
  aside: Record<InvId, InstId[]>;
  xp: Record<InvId, number>;
  hunch: Record<InvId, InstId[]>;
  hunchRevealed: Record<InvId, InstId>;
  attacked: Record<string, number>;
  noAttack: Record<string, number>;
}

/** what makes a card this card: its id never changes, its code does when a card is turned over or transformed */
export interface CardIdentity {
  id: InstId;
  code: string;
}

/**
 * One table per card field (ADR-0024), keyed by card id. A table holds an entry only for a value other than the field's
 * default (none, false or 0); `zone` has an entry for every card. Read and written through a card view, never directly.
 */
export interface CardTables {
  zone: Record<InstId, Zone>;
  owner: Record<InstId, InvId>;
  controller: Record<InstId, InvId>;
  exhausted: Record<InstId, true>;
  revealed: Record<InstId, true>;
  damage: Record<InstId, number>;
  horror: Record<InstId, number>;
  clues: Record<InstId, number>;
  doom: Record<InstId, number>;
  uses: Record<InstId, number>;
  resources: Record<InstId, number>;
  /** enemies: location; attachments: location they are attached to */
  location: Record<InstId, InstId>;
  engagedWith: Record<InstId, InvId>;
  /** cards attached to another card (not location) */
  attachedTo: Record<InstId, InstId>;
}

/** a card instance as code outside the core sees it: read, never written (ADR-0022) */
export type CardView = Readonly<CardInst>;

export interface InvState {
  id: InvId;
  cardId: InstId;
  name: string;
  deck: InstId[];
  hand: InstId[];
  discard: InstId[];
  location: InstId | null;
  /** the vehicle they are in, at its location (absent: none) */
  vehicle?: InstId | null;
  damage: number;
  horror: number;
  clues: number;
  resources: number;
  actionsLeft: number;
  /** extra actions only usable for abilities of cards matching trait (Daisy: Tome) */
  restrictedActions: { trait?: string; designator?: string; left: number }[];
  /** actions taken this turn by designator, for "first time you do X each round" (Frozen in Fear) */
  actionsThisRound: string[];
  /** actions spent this turn (reset when the turn begins), for "play only as your first action" */
  actionsTaken: number;
  /** printed health of the enemies this investigator defeated since a turn began (Evidence!) */
  defeatedHealth: number;
  status: InvStatus;
  defeatedBy?: "damage" | "horror";
  turnDone: boolean;
  physicalTrauma: number;
  mentalTrauma: number;
  player: number;
}

/** an investigator as code outside the core sees it: read, never written, its piles and lists too (ADR-0022) */
export type InvView = Readonly<
  Omit<InvState, "deck" | "hand" | "discard" | "restrictedActions" | "actionsThisRound">
> & {
  readonly deck: readonly InstId[];
  readonly hand: readonly InstId[];
  readonly discard: readonly InstId[];
  readonly restrictedActions: readonly Readonly<InvState["restrictedActions"][number]>[];
  readonly actionsThisRound: readonly string[];
};

export interface TempMod {
  id: number;
  mod: Modifier;
  /** InvId or InstId */
  target: string;
  until: "test" | "turn" | "phase" | "round";
  source: InstId | null;
}

export interface SkillTestState {
  id: number;
  inv: InvId;
  skill: Skill;
  difficulty: number;
  kind: "investigate" | "fight" | "evade" | "plain";
  source: InstId | null;
  sourceLabel: string;
  target: InstId | null;
  committed: InstId[];
  committers: InvId[];
  tokens: ChaosToken[];
  /** resolved token modifiers, one per token */
  tokenMods: number[];
  autoFail: boolean;
  autoSucceed: boolean;
  skillBonus: number; // from the action itself (weapon +1 etc)
  damageBonus: number;
  shroudMod: number;
  value?: number;
  total?: number;
  success?: boolean;
  margin?: number;
  onSuccess?: Effect[];
  onFail?: Effect[];
  perPointFailed?: Effect[];
  insteadOfClues?: Effect[];
  onTokens?: { tokens: string[]; effects: Effect[] };
  /** +1 damage if the attack succeeds by at least this much */
  marginDamage?: number;
  /** damage by the margin (Shotgun) */
  damagePerMargin?: { max: number; instead?: boolean; failMax?: number };
  /** paid for more after a success (Sledgehammer); asked once */
  boost?: Boost;
  boostDone?: boolean;
  /** clues the boost added */
  boostClues?: number;
  /** effects when the attack defeats its enemy */
  onDefeat?: Effect[];
  /** the late commit window (Timely Intervention) was asked */
  lateAsked?: boolean;
  /** script continuation run after results: {code, fn} */
  after?: { code: string; fn: string };
  ctx: EffCtx;
  tokenOnFail: Effect[];
  tokenAfter: Effect[];
  tokenOnSuccess: Effect[];
  failWindowDone: boolean;
  /** number of tokens whose effects were resolved */
  resolvedTokens: number;
  flipNegative: boolean;
  /** tokens revealed when the "would reveal" window was last opened (it opens once per reveal) */
  revealAsked?: number;
  /** additional tokens the next reveal draws, one of which is chosen (Grotesque Statue) */
  extraReveal?: number;
  /** a script run with the token chosen from several (Mask of Silenus) */
  onChoose?: { code: string; fn: string };
  /** tokens drawn by a reveal and not yet chosen between */
  drawn?: ChaosToken[];
  /** tokens drawn and not chosen: ignored, back in the bag when the test ends */
  ignored?: ChaosToken[];
  /** cancel key of the most recently revealed token */
  tokenKey?: string;
  /** chosen skill when the test allows several (Locked Door) */
}

export interface EffCtx {
  source?: InstId | null;
  /** the keyword an enemy was defeated through (a predator's attack) */
  via?: "predator";
  /** card from the triggering event (e.g. the treachery drawn, the card played) */
  card?: InstId | null;
  /** "you": controller of the source / investigator resolving the effect */
  you?: InvId | null;
  enemy?: InstId | null;
  location?: InstId | null;
  inv?: InvId | null;
  failBy?: number;
  succeedBy?: number;
  /** cancel key of the interrupted event */
  key?: string;
  token?: ChaosToken;
  /** test id the effect belongs to */
  testId?: number;
  x?: number;
  /** the location a move left (enterLocation) */
  from?: InstId | null;
  /** [damage, horror] an attack just dealt, in its attackDealsDamage window */
  dealt?: [number, number];
  /** the card whose effect caused the event (horrorHealed) */
  by?: InstId | null;
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** board entity the option corresponds to (for click-to-choose in 3D) */
  card?: InstId;
  value: unknown;
  /** a string of the UI that says this option in the game's language (the engine's label stays the English text) */
  key?: string;
  vars?: Record<string, string | number>;
}

export interface PendingChoice {
  seq: number;
  inv: InvId;
  kind: ChoiceKind;
  prompt: string;
  /** translation key and values for the prompt (the English text above is the fallback); ids in the values are investigators or cards */
  promptKey?: string;
  promptVars?: Record<string, string | number | null>;
  options: ChoiceOption[];
  /** deck cards looked at alongside the options that aren't options themselves (a search's other top cards) */
  shown?: InstId[];
  step: Step;
}

export type TurnAction =
  | { kind: "investigate" }
  | { kind: "move"; to: InstId }
  | { kind: "draw" }
  | { kind: "resource" }
  | { kind: "play"; card: InstId }
  | { kind: "ability"; card: InstId; index: number }
  | { kind: "fight"; enemy: InstId }
  | { kind: "engage"; enemy: InstId }
  | { kind: "evade"; enemy: InstId }
  /** `deck`: another act deck than `a` */
  | { kind: "advanceAct"; deck?: string }
  /** a vehicle at your location: getting in, getting out (fast, once each per round) */
  | { kind: "enterVehicle"; vehicle: InstId }
  | { kind: "leaveVehicle" }
  /** a Veiled location with no clues: turned to its story side and resolved */
  | { kind: "flipVeiled"; location: InstId }
  | { kind: "endTurn" };

/** engine steps; resolved LIFO from state.queue */
export type Step = { choice?: any } & (
  | { t: "Setup" }
  | { t: "Mulligan"; inv: InvId; chosen?: InstId[] }
  | { t: "StartRound" }
  | { t: "PhasePause"; phase: "mythos" | "investigation" | "enemy" | "upkeep" }
  | { t: "MythosPhase" }
  | { t: "MythosDraw"; inv: InvId }
  | { t: "InvestigationPhase" }
  | { t: "NextTurn" }
  | { t: "Turn"; inv: InvId }
  | { t: "EndTurn"; inv: InvId }
  | { t: "PerformAction"; inv: InvId; action: TurnAction; free?: boolean }
  | { t: "EnemyPhase" }
  | { t: "HunterMoves"; done?: InstId[]; stepped?: boolean }
  | { t: "EnemyAttacks"; inv?: InvId; done?: InstId[] }
  | { t: "UpkeepPhase" }
  | { t: "HandSize"; inv: InvId; stepped?: boolean }
  | { t: "EndRound" }
  | { t: "Window"; trigger: Trigger; data: EventData; offered?: string[]; forcedDone?: boolean }
  | { t: "Effects"; effects: Effect[]; ctx: EffCtx }
  | { t: "Eff"; effect: Effect; ctx: EffCtx }
  | { t: "GainClues"; inv: InvId; location: InstId; n: number; key: string }
  | { t: "SlotCheck"; inv: InvId; card: InstId }
  | { t: "EnterPlay"; inv: InvId; card: InstId }
  | { t: "ChooseTurnOrder" }
  | { t: "Script"; code: string; fn: string; ctx: EffCtx; args?: unknown }
  // the engine's deferred rules: each runs after the steps queued before it
  | { t: "ExhaustEnemy"; enemy: InstId }
  | { t: "Elusive"; enemy: InstId }
  | { t: "FinishRevelation"; card: InstId; inv: InvId }
  | { t: "AllEliminated" }
  | { t: "NextAgenda"; card: InstId; deck?: string }
  | { t: "NextAct"; card: InstId; deck?: string }
  | { t: "FinishEvent"; ctx: EffCtx }
  | { t: "AssetDefeatCheck"; inv: InvId }
  | { t: "RemoveDefeatedAsset"; card: InstId }
  /** `by`: the investigator who revealed it (by entering), for its "after you reveal" abilities */
  | { t: "RevealLocation"; location: InstId; by?: InvId }
  | { t: "CheckEngagement"; inv: InvId }
  | { t: "ChooseLead" }
  | { t: "Investigate"; inv: InvId; location: InstId }
  | { t: "BasicFight"; ctx: EffCtx }
  | { t: "BasicEvade"; ctx: EffCtx }
  | { t: "EndTurnCleanup"; inv: InvId }
  | { t: "GainResource"; inv: InvId }
  | { t: "RoundCleanup" }
  | { t: "ReadyAll" }
  | { t: "DiscardIfEmpty"; card: InstId }
  | {
      t: "UseAbility";
      inv: InvId;
      card: InstId;
      index: number;
      ctx?: EffCtx;
      paid?: boolean;
      discards?: InstId[];
    }
  | { t: "PlayCard"; inv: InvId; card: InstId; ctx?: EffCtx; free?: boolean; viaTrigger?: boolean }
  /** `tapped`: the draw was asked for by tapping the deck already (the Draw action, or the second card of a draw of several) */
  | { t: "Draw"; inv: InvId; n: number; tapped?: boolean }
  /** `card`: that card is drawn as the encounter card (from beneath a card), not the deck's top */
  | { t: "DrawEncounter"; inv: InvId; card?: InstId }
  | { t: "Revelation"; inv: InvId; card: InstId }
  | { t: "Spawn"; enemy: InstId; inv: InvId | null; at?: InstId | null }
  | { t: "EnemyAttack"; enemy: InstId; inv: InvId; aoo: boolean; key: string }
  | { t: "ResolveAttack"; enemy: InstId; inv: InvId; key: string }
  | {
      t: "AssignDamage";
      inv: InvId;
      damage: number;
      horror: number;
      direct: boolean;
      source: InstId | null;
      enemy?: InstId | null;
      /** the attack's key: what its window prevented waits under it */ key?: string;
      assigned?: Record<string, [number, number]>;
      /** the damageDealt window has been opened for it */
      windowed?: boolean;
    }
  | {
      t: "AfterDamage";
      inv: InvId;
      damage: number;
      horror: number;
      assets: InstId[];
      enemy: InstId | null;
    }
  | {
      t: "DamageEnemy";
      enemy: InstId;
      amount: number;
      by: InvId | null;
      attack?: boolean;
      /** the card dealing it */ source?: InstId | null;
      key?: string;
      windowed?: boolean;
      /** dealt through a keyword (a predator's attack): its defeat says so */
      via?: "predator";
    }
  | {
      t: "DefeatEnemy";
      enemy: InstId;
      by: InvId | null;
      fired?: boolean;
      checked?: boolean;
      key?: string;
      via?: "predator";
    }
  | { t: "Move"; inv: InvId; to: InstId; key?: string }
  | { t: "Arrive"; inv: InvId; to: InstId; key?: string }
  | { t: "DiscoverClues"; inv: InvId; location: InstId; n: number }
  /** `agenda`: on the current agenda, the lead choosing when there are several decks */
  | { t: "PlaceDoom"; card: InstId | "agenda"; n: number }
  | { t: "CheckDoom" }
  | { t: "AdvanceAgenda"; fired?: boolean; deck?: string }
  | { t: "AdvanceAct"; spend?: boolean; deck?: string }
  | { t: "Resolution"; id: string }
  | { t: "CheckDefeat"; inv: InvId }
  /** `effect`: a card or the scenario defeats them (a location removed with them in it): no trauma */
  | { t: "Defeated"; inv: InvId; by: "damage" | "horror" | "resign" | "effect"; key?: string }
  | {
      t: "Test";
      stage: TestStage;
      asked?: InvId[];
    }
  | { t: "EnemyEngage"; enemy: InstId; inv: InvId }
  | { t: "CheckObjectives" }
  | { t: "ForEachInv"; invs: InvId[]; step: Step }
  /** put looked-at cards back on top of a deck in the order chosen: `placed` from the top down, the last one goes under them */
  | { t: "ArrangeTop"; inv: InvId; deck: InvId | "encounter"; cards: InstId[]; placed: InstId[] }
  /** turn a card to its other printed face (engine-scenario-structure) */
  | { t: "Flip"; card: InstId }
  /** a story face: shown, its abilities run, then what the card says (flip back, leave the game, stay) */
  | { t: "ResolveStory"; card: InstId; you: InvId; shown?: boolean }
  /** a location leaves play: the investigators there defeated (or moved `to`), its enemies discarded, the scenario told */
  | { t: "RemoveLocation"; location: InstId; investigators?: "defeat" | "move"; to?: InstId }
  | { t: "EnterVehicle"; inv: InvId; vehicle: InstId }
  | { t: "LeaveVehicle"; inv: InvId }
  /** a vehicle moves, the investigators in it with it (arriving, without a move action) */
  | { t: "MoveVehicle"; vehicle: InstId; to: InstId }
  /** each ready unengaged Patrol enemy moves one step toward its target (`toward`: the target the lead chose) */
  | { t: "PatrolMoves"; done?: InstId[]; toward?: InstId }
  /** Relentless: after its enemy-phase attack the enemy readies and attacks again */
  | { t: "RelentlessAttack"; enemy: InstId; inv: InvId }
  /** after the enemy attacks: each ready unengaged Predator attacks a non-Elite enemy at its location */
  | { t: "PredatorAttacks"; done?: InstId[] }
  /** the top `n` cards of an investigator's deck facedown beneath a swarming enemy */
  | { t: "AddSwarm"; host: InstId; inv: InvId; n: number }
  /** the scenario pauses on one of its interludes; the lead answers its choice */
  | { t: "ReadInterlude"; id: string }
);
/** the step of one kind */
export type StepOf<K extends Step["t"]> = Extract<Step, { t: K }>;

export interface EventData {
  inv?: InvId | null;
  /** the card whose effect caused the event (horrorHealed) */
  by?: InstId | null;
  /** the keyword an enemy was defeated through (a predator's attack) */
  via?: "predator";
  /** what would defeat an investigator or enemy (a wouldBeDefeated window) */
  cause?: "damage" | "horror" | "both" | "effect";
  enemy?: InstId | null;
  location?: InstId | null;
  card?: InstId | null;
  phase?: string;
  key?: string;
  margin?: number;
  testKind?: string;
  token?: ChaosToken;
  /** the test this event belongs to */
  testId?: number;
  amount?: number;
  /** the location a move left (enterLocation) */
  from?: InstId | null;
  /** what an attack just dealt (the attackDealsDamage window) */
  damage?: number;
  horror?: number;
}

export interface GameEvent {
  type: EventType;
  text: string;
  inv?: InvId | null;
  card?: InstId | null;
  data?: Record<string, unknown>;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  seq: number;
  scenarioId: string;
  campaignId: string;
  difficulty: Difficulty;
  round: number;
  phase: Phase;
  /** `reveal`: bumped by every choice that brought hidden information into play (a random draw, a card leaving a deck, deck cards shown) */
  counters: { turn: number; phase: number; round: number; test: number; reveal: number };
  world: World;
  order: InvId[];
  lead: InvId;
  active: InvId | null;
  /** set from the setup: each phase waits for the lead investigator */
  pacePhases?: boolean;
  /** set from the setup: every draw in play waits for the drawing investigator to tap the deck */
  tapDecks?: boolean;
  /** each act deck's current card, by deck name in deck order; a one-deck scenario's deck is `a` */
  acts: Record<string, InstId | null>;
  /** each agenda deck's current card, as `acts` */
  agendas: Record<string, InstId | null>;
  chaosBag: ChaosToken[];
  skillTest: SkillTestState | null;
  testStack: SkillTestState[];
  tempMods: TempMod[];
  usage: Record<string, number>;
  queue: Step[];
  pending: PendingChoice | null;
  cancelled: string[];
  log: GameEvent[];
  flags: Record<string, unknown>;
  /** campaign log snapshot available to scenario scripts */
  campaignLog: Record<string, unknown>;
  resolution: string | null;
  nextId: number;
}

export type Action = { type: "choose"; inv: InvId; option: string };

export interface ScriptApi {
  [k: string]: unknown;
}

/** behavior implemented in TS for one card / scenario */
export interface CardScript {
  /** abilities replacing/adding to data abilities; `run` names a fn in fns */
  abilities?: (Ability & { run?: string })[];
  fns?: Record<string, ScriptFn>;
  /** conditions named by `{ script: name }` in the card's (or scenario's) data */
  conditions?: Record<string, (game: GameContext, ctx: EffCtx) => boolean>;
  /** icons the card gains on top of its printed ones, while it is committed (Steadfast, Curiosity) */
  icons?: (game: GameContext, cardId: InstId) => Partial<Record<Skill | "wild", number>>;
  /** dynamic constant modifiers */
  modifiers?: (game: GameContext, cardId: InstId) => { target: string; mod: Modifier }[];
  /** cards (e.g. top event of discard) the controller may additionally play */
  extraPlayable?: (game: GameContext, cardId: InstId, inv: InvId) => InstId[];
  /** card instances whose text is treated as blank while this card is in play */
  blanks?: (game: GameContext, cardId: InstId) => InstId[];
  /** additional action cost for a designator (Frozen in Fear) */
  extraActionCost?: (
    game: GameContext,
    cardId: InstId,
    inv: InvId,
    designator: string,
    action?: TurnAction,
  ) => number;
  /** when doom would be placed while this card is the agenda: true replaces it (Brethren of Ash) */
  wouldPlaceDoom?: (game: GameContext, cardId: InstId, n: number) => boolean;
  /** called by the engine for special hooks */
  hooks?: Partial<ScriptHooks>;
  /** a search that finds this card ends there: the rest of the search is not resolved (Dead Ends) */
  cancelsSearch?: true;
}

/** what a choice verb shows: the English prompt and the UI's translation key and values */
export interface ScriptPrompt {
  text: string;
  key?: string;
  vars?: Record<string, string | number | null>;
}
export interface ChooseOpts {
  /** take a single option without asking (default true) */
  auto?: boolean;
  /** the kind of the pending choice (default `target`) */
  kind?: ChoiceKind;
  /** who chooses (default the run's investigator) */
  who?: InvId;
  /** deck cards shown beside the options */
  shown?: InstId[];
}

/**
 * What a script function is given (built only by the script adapter, `rules/scripts.ts`): the investigator it resolves
 * for, the step, its context and arguments, and choice verbs. A verb returns the chosen value; when the player has to
 * choose, the script stops there and the whole step runs again from the top once the choice is made, so code before
 * the first choice must not change the game.
 */
export interface ScriptRun {
  /** the context's investigator, else the lead */
  readonly you: InvId;
  /** the source card; reading it when the step has none throws, naming the script */
  readonly source: InstId;
  readonly step: Step;
  readonly ctx: EffCtx;
  readonly args: unknown;
  chooseCard(ids: InstId[], prompt: ScriptPrompt, opts?: ChooseOpts): InstId;
  chooseInvestigator(invs: InvId[], prompt: ScriptPrompt, opts?: ChooseOpts): InvId;
  choose<T = unknown>(options: ChoiceOption[], prompt: ScriptPrompt, opts?: ChooseOpts): T;
}
export type ScriptFn = (game: GameContext, run: ScriptRun) => void;
/** what a card's or investigator's hook is given: no step, so a hook can't wait on a choice */
export interface HookRun {
  /** the card's controller, else the lead */
  readonly you: InvId;
  /** the card the hook belongs to; reading it when there is none throws */
  readonly source: InstId;
  readonly ctx: EffCtx;
}

/** every moment the engine fires a script hook at, each with its own signature (a misspelt name fails the typecheck) */
export interface ScriptHooks {
  /** an investigator's own setup, before their deck is shuffled (Joe Diamond's hunch deck) */
  setup(game: GameContext, run: HookRun): void;
  /** scenario: after anything that can complete an objective */
  checkObjectives(game: GameContext): void;
  /** scenario: what it records about the game as it ends, before its cards are gone; `won` unless no resolution */
  ended(game: GameContext, won: boolean): void;
  /** scenario: every investigator is eliminated (default: no resolution) */
  allEliminated(game: GameContext): void;
  /** scenario: where an enemy with no spawn location of its own spawns, if the scenario says */
  spawnRedirect(game: GameContext, enemy: InstId): InstId | null | undefined;
  /** card: "when the game ends" (Cover Up, Hospital Debts) */
  gameEnd(game: GameContext, run: HookRun): void;
  /** card: an event its controller played finished resolving (Wendy's Amulet) */
  eventFinished(game: GameContext, run: HookRun, event: InstId): void;
  /** card: a heal of `n` horror from `target` is about to happen; returns what may still be healed (Rational Thought) */
  healHorror(game: GameContext, run: HookRun, target: InstId, n: number): number;
  /** card: its story face was resolved, after its abilities and before what the card says to do next */
  storyResolved(game: GameContext, run: HookRun, card: InstId): void;
  /** scenario: a location is leaving play (removed), before it goes */
  locationLeavesPlay(game: GameContext, location: InstId): void;
  /** scenario: an investigator (or an enemy) would be defeated; `true` cancels the defeat (Dim Carcosa's sanity rule) */
  wouldBeDefeated(
    game: GameContext,
    who: InvId | InstId,
    by: "damage" | "horror" | "both" | "effect",
  ): boolean;
  /** scenario: where a Patrol enemy patrols toward, when its expression can't say (Fortune and Folly's ring) */
  patrolTarget(game: GameContext, enemy: InstId): InstId[] | undefined;
}

/** engine context passed to every rule: the state (mutated in place, one deep copy per choice) + static content */
export interface GameContext {
  s: GameState;
  db: ContentDb;
  events: GameEvent[];
}

export interface ContentDb {
  cards: Record<string, CardDef>;
  investigators: Record<string, InvestigatorDef>;
  decks: Record<string, DeckDef>;
  scenarios: Record<string, ScenarioDef>;
  campaigns: Record<string, CampaignDef>;
  /** each campaign's flow (interludes, branches, choices between scenarios); a generated campaign's arrives with its scenarios (loadCampaign) */
  flows: Record<string, CampaignFlow>;
  /** keyed by card code or scenario id */
  scripts: Record<string, CardScript>;
  encounterSets: Record<string, string[]>;
  i18n: Record<
    string,
    { cards: Record<string, any>; ui: Record<string, string>; campaigns: I18nCampaigns }
  >;
  /** the sound clips and tracks and what they serve (content/sounds/sounds.json) */
  sounds: SoundManifest;
  /** every pack of cards (a folder under content/packs): whether it is loaded, and its card codes once it is */
  packs: Record<string, { loaded: boolean; cards: string[] }>;
  /** generated campaigns whose scenarios the browser loads when chosen (loadCampaign): false until loaded */
  campaignsLoaded?: Record<string, boolean>;
  /** content/coverage.json: how much of the content works (eager, so the new-game screen has it before any pack loads) */
  coverage?: ContentCoverage;
}

export interface GameSetup {
  campaignId: string;
  scenarioId: string;
  difficulty: Difficulty;
  seed: number;
  investigators: {
    code: InvId;
    /** full deck card codes (including signatures, weaknesses) */
    deck: string[];
    physicalTrauma?: number;
    mentalTrauma?: number;
  }[];
  campaignLog?: Record<string, unknown>;
  chaosBag?: ChaosToken[];
  /** wait for the lead investigator before each phase (the UI's games; engine tests and old saves don't) */
  pacePhases?: boolean;
  /** wait for the drawing investigator to tap the deck before each draw in play (the UI's games; engine tests and old saves don't) */
  tapDecks?: boolean;
  /** the campaign's options chosen when it was created (`CampaignDef.options` ids): the encounter sets they swap in */
  options?: string[];
}

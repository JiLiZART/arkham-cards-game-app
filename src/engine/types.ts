import type {
  Ability, CampaignDef, CampaignFlow, CardDef, ChaosToken, ContentCoverage, DeckDef, Difficulty, Effect, I18nCampaigns, InvestigatorDef, Modifier, ScenarioDef, Skill, SoundManifest, Trigger,
} from "../content/schema";

export type InstId = string;
export type InvId = string;

export type Zone =
  | "deck" | "hand" | "discard" | "play" | "threat" | "commit"
  | "encounterDeck" | "encounterDiscard" | "sideDeck"
  | "location" | "enemy" | "attached"
  | "act" | "agenda" | "actDeck" | "agendaDeck"
  | "victory" | "setAside" | "removed" | "investigator" | "resolving" | "limbo";

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

export type InvStatus = "playing" | "resigned" | "defeated";

export interface InvState {
  id: InvId;
  cardId: InstId;
  name: string;
  deck: InstId[];
  hand: InstId[];
  discard: InstId[];
  location: InstId | null;
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
  /** cancel key of the most recently revealed token */
  tokenKey?: string;
  /** chosen skill when the test allows several (Locked Door) */
}

export interface EffCtx {
  source?: InstId | null;
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
  kind: "turn" | "target" | "commit" | "reaction" | "generic" | "mulligan" | "assign" | "order" | "phase" | "draw";
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
  | { kind: "advanceAct" }
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
  | { t: "Script"; code: string; fn: string; ctx: EffCtx; args?: any }
  | { t: "DiscardIfEmpty"; card: InstId }
  | { t: "UseAbility"; inv: InvId; card: InstId; index: number; ctx?: EffCtx; paid?: boolean; discards?: InstId[] }
  | { t: "PlayCard"; inv: InvId; card: InstId; ctx?: EffCtx; free?: boolean; viaTrigger?: boolean }
  /** `tapped`: the draw was asked for by tapping the deck already (the Draw action, or the second card of a draw of several) */
  | { t: "Draw"; inv: InvId; n: number; tapped?: boolean }
  | { t: "DrawEncounter"; inv: InvId }
  | { t: "Revelation"; inv: InvId; card: InstId }
  | { t: "Spawn"; enemy: InstId; inv: InvId | null; at?: InstId | null }
  | { t: "EnemyAttack"; enemy: InstId; inv: InvId; aoo: boolean; key: string }
  | { t: "ResolveAttack"; enemy: InstId; inv: InvId; key: string }
  | { t: "AssignDamage"; inv: InvId; damage: number; horror: number; direct: boolean; source: InstId | null; enemy?: InstId | null; /** the attack's key: what its window prevented waits under it */ key?: string; assigned?: Record<string, [number, number]> }
  | { t: "AfterDamage"; inv: InvId; damage: number; horror: number; assets: InstId[]; enemy: InstId | null }
  | { t: "DamageEnemy"; enemy: InstId; amount: number; by: InvId | null; attack?: boolean; /** the card dealing it */ source?: InstId | null; key?: string; windowed?: boolean }
  | { t: "DefeatEnemy"; enemy: InstId; by: InvId | null; fired?: boolean }
  | { t: "Move"; inv: InvId; to: InstId; key?: string }
  | { t: "Arrive"; inv: InvId; to: InstId; key?: string }
  | { t: "DiscoverClues"; inv: InvId; location: InstId; n: number }
  | { t: "PlaceDoom"; card: InstId; n: number }
  | { t: "CheckDoom" }
  | { t: "AdvanceAgenda"; fired?: boolean }
  | { t: "AdvanceAct"; spend?: boolean }
  | { t: "Resolution"; id: string }
  | { t: "Choose"; inv: InvId; prompt: string; options: { label: string; effects: Effect[] }[]; ctx: EffCtx }
  | { t: "CheckDefeat"; inv: InvId }
  | { t: "Defeated"; inv: InvId; by: "damage" | "horror" | "resign" }
  | { t: "Test"; stage: "commit" | "reveal" | "afterReveal" | "resolveTokens" | "result" | "apply" | "kindResult" | "end"; asked?: InvId[] }
  | { t: "EnemyEngage"; enemy: InstId; inv: InvId }
  | { t: "CheckObjectives" }
  | { t: "ForEachInv"; invs: InvId[]; step: Step }
  /** put looked-at cards back on top of a deck in the order chosen: `placed` from the top down, the last one goes under them */
  | { t: "ArrangeTop"; inv: InvId; deck: InvId | "encounter"; cards: InstId[]; placed: InstId[] }
);

export interface EventData {
  inv?: InvId | null;
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
  type: string;
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
  phase: "setup" | "mythos" | "investigation" | "enemy" | "upkeep" | "ended";
  /** `reveal`: bumped by every choice that brought hidden information into play (a random draw, a card leaving a deck, deck cards shown) */
  counters: { turn: number; phase: number; round: number; test: number; reveal: number };
  cards: Record<InstId, CardInst>;
  invs: Record<InvId, InvState>;
  order: InvId[];
  lead: InvId;
  active: InvId | null;
  /** set from the setup: each phase waits for the lead investigator */
  pacePhases?: boolean;
  /** set from the setup: every draw in play waits for the drawing investigator to tap the deck */
  tapDecks?: boolean;
  encounterDeck: InstId[];
  encounterDiscard: InstId[];
  sideDecks: Record<string, InstId[]>;
  act: InstId | null;
  agenda: InstId | null;
  actDeck: InstId[];
  agendaDeck: InstId[];
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
  /** dynamic constant modifiers */
  modifiers?: (g: any, cardId: InstId) => { target: string; mod: Modifier }[];
  /** cards (e.g. top event of discard) the controller may additionally play */
  extraPlayable?: (g: any, cardId: InstId, inv: InvId) => InstId[];
  /** card instances whose text is treated as blank while this card is in play */
  blanks?: (g: any, cardId: InstId) => InstId[];
  /** additional action cost for a designator (Frozen in Fear) */
  extraActionCost?: (g: any, cardId: InstId, inv: InvId, designator: string) => number;
  /** called by the engine for special hooks */
  hooks?: Partial<Record<string, ScriptFn>>;
}
export type ScriptFn = (g: any, ctx: EffCtx, args?: any, step?: Step) => void;

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
  i18n: Record<string, { cards: Record<string, any>; ui: Record<string, string>; campaigns: I18nCampaigns }>;
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
}

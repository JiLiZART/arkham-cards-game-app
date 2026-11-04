import { z } from "zod";
import { EVENT } from "../engine/events/event";
import { ZONE, PHASE, CHOICE, TEST_STAGE } from "../engine/world/constants";

// ---------- primitives ----------
export const SKILLS = ["willpower", "intellect", "combat", "agility"] as const;
export const Skill = z.enum(SKILLS);
export type Skill = z.infer<typeof Skill>;

export const CHAOS_TOKENS = [
  "+1",
  "0",
  "-1",
  "-2",
  "-3",
  "-4",
  "-5",
  "-6",
  "-7",
  "-8",
  "skull",
  "cultist",
  "tablet",
  "elderThing",
  "autoFail",
  "elderSign",
  // Children of Blood
  "blood",
] as const;
export const ChaosToken = z.enum(CHAOS_TOKENS);
export type ChaosToken = z.infer<typeof ChaosToken>;
export const SYMBOL_TOKENS = ["skull", "cultist", "tablet", "elderThing", "blood"] as const;
export type SymbolToken = (typeof SYMBOL_TOKENS)[number];

export const CardType = z.enum([
  ZONE.Investigator,
  "asset",
  "event",
  "skill",
  "treachery",
  ZONE.Enemy,
  EVENT.Location,
  EVENT.Act,
  EVENT.Agenda,
  "scenario",
  // later cycles: story cards, keys and enemy-locations
  "story",
  "key",
  "enemy_location",
]);
export type CardType = z.infer<typeof CardType>;

export const Slot = z.enum([ZONE.Hand, "arcane", "accessory", "body", "ally", "tarot", "head"]);
export type Slot = z.infer<typeof Slot>;

/** the card a pile of facedown cards lies beneath: this card, the current act or agenda, the scenario card, your location */
export const BeneathOf = z.enum(["self", "act", "agenda", "scenario", "yourLocation"]);
export type BeneathOf = z.infer<typeof BeneathOf>;

/** who holds named tokens: this card, you, your location */
export const TokenHolder = z.enum(["self", "you", "yourLocation"]);
export type TokenHolder = z.infer<typeof TokenHolder>;

/** a number, or something computed from the effect context */
export const Amount = z.union([
  z.number(),
  z.enum(["failBy", "succeedBy", "all", "X"]),
  z.object({ perInvestigator: z.number() }),
  /** the tokens on the source card itself */
  z.object({ onSelf: z.enum([EVENT.Damage, "horror", EVENT.Clues, "resources", EVENT.Doom]) }),
  /** n per clue you control, at most max (Through the Cracks) */
  z.object({ yourClues: z.number(), max: z.number().optional() }),
  /** your skill value (Augur of Elokoss) */
  z.object({ yourSkill: z.enum(SKILLS) }),
  /** the cards beneath a card */
  z.object({ beneathCount: BeneathOf }),
  /** the named tokens a card or you hold */
  z.object({ tokensOn: z.object({ name: z.string(), on: TokenHolder }).strict() }),
]);
export type Amount = z.infer<typeof Amount>;

/** card filters used by search/discard-until/conditions */
export const CardFilter = z
  .object({
    type: z.union([CardType, z.array(CardType)]).optional(),
    trait: z.union([z.string(), z.array(z.string())]).optional(), // any of
    code: z.union([z.string(), z.array(z.string())]).optional(),
    unique: z.boolean().optional(),
    weakness: z.boolean().optional(),
    elite: z.boolean().optional(),
    faction: z.union([z.string(), z.array(z.string())]).optional(),
    /** level at most (a level 0 event) */
    maxXp: z.number().optional(),
  })
  .strict();
export type CardFilter = z.infer<typeof CardFilter>;

/** who an effect applies to (investigators) */
export const InvTarget = z.enum([
  "you", // controller of the source / the investigator resolving
  EVENT.Lead,
  "chooseAtLocation", // you choose an investigator at your location
  "chooseOtherAtLocation", // ... other than yourself
  "eachAtLocation",
  "each",
  "eventInvestigator", // investigator from the triggering event
]);
export type InvTarget = z.infer<typeof InvTarget>;

/** which enemy */
export const EnemyTarget = z.enum([
  "self", // the source card is the enemy
  "chooseAtLocation",
  "chooseExhaustedAtLocation",
  "chooseEngaged", // an enemy engaged with you
  "eachAtLocation",
  "eventEnemy", // enemy from the triggering event / skill test target
  "nearestCultist",
  "nearestEnemy",
]);
export type EnemyTarget = z.infer<typeof EnemyTarget>;

export const Duration = z.enum(["test", EVENT.Turn, EVENT.Phase, "round"]);

// ---------- modifiers (constant or temporary) ----------
export const ModStat = z.enum([
  "willpower",
  "intellect",
  "combat",
  "agility",
  "health",
  "sanity",
  "shroud",
  "fight",
  EVENT.Evade,
  "enemyHealth",
  EVENT.EnemyDamage,
  "enemyHorror",
  "additionalActions",
  "handSlots",
  "arcaneSlots",
  "allySlots",
  "accessorySlots",
  "bodySlots",
  "cost",
  "attackDamage",
  "clueBonus",
  "testValue",
  /** what each Hidden card in hand counts for beyond itself, toward hand size (Backstage: 2, three each) */
  "hiddenHandWeight",
  /** maximum hand size at the end of upkeep (Laboratory Assistant) */
  "handSize",
]);
export type ModStat = z.infer<typeof ModStat>;

export const ModFlag = z.enum([
  "cannotPlayAssetsOrEvents",
  "cannotBeInvestigated",
  "cannotDiscoverClues",
  "cannotSpendClues",
  "cannotMoveInto",
  "nonEliteCannotMoveInto",
  "nonEliteCannotAttack",
  "doubleNegativeTokens",
  "blankText",
  "noChaosTokens",
  "intellectForCombatAndAgility",
  "elderSignIsAutoFail",
  "damageCapOne",
  "cannotPlayAssets",
  /** abilities of the assets you control can't be triggered, but the source's own (The Necronomicon) */
  "cannotUseOtherAssetAbilities",
  /** your first action each round provokes no attack of opportunity (Dr. Henry Armitage) */
  "firstActionNoAoO",
  /** cards matching the modifier's filter can't be played or committed (Languor) */
  "cannotPlayOrCommit",
  "noAttacksOfOpportunity",
  "cannotBeDamaged",
]);
export type ModFlag = z.infer<typeof ModFlag>;

/** when (during what kind of test) a modifier applies */
export const ModWhen = z.enum(["always", "investigating", "fighting", "evading", "skillTest"]);

/** who/what a constant modifier applies to */
export const ModScope = z.enum([
  "controller", // investigator controlling source (or bearer of threat-area card)
  "investigatorsAtLocation", // each investigator at controller's location
  "attachedLocation",
  "self", // the card itself (enemy/location)
  "allEnemies",
  "tester", // the investigator performing the current test (temporary modifiers)
]);

export const Modifier = z
  .object({
    stat: ModStat.optional(),
    flag: ModFlag.optional(),
    value: z.number().optional(),
    perInvestigator: z.boolean().optional(),
    when: ModWhen.optional(),
    scope: ModScope.optional(),
    /** extra filter for cost/slot modifiers, e.g. only Tome assets */
    filter: CardFilter.optional(),
    /** use another skill instead (Mind over Matter style) */
    useSkill: Skill.optional(),
    /** the targets gain this keyword (an agenda's "each enemy gains Patrol (…)") */
    keyword: z.lazy(() => Keyword).optional(),
  })
  .strict();
export type Modifier = z.infer<typeof Modifier>;

export const Cost = z
  .object({
    exhaust: z.boolean().optional(),
    uses: z.number().optional(),
    resources: z.number().optional(),
    clues: z.number().optional(),
    cluesPerInvestigator: z.number().optional(), // group spend
    discardSelf: z.boolean().optional(),
    horrorOnSelf: z.number().optional(), // place horror on this card (Aquinnah)
    damageOnSelf: z.number().optional(),
    takeHorror: z.number().optional(),
    takeDamage: z.number().optional(),
    /** resources spent per investigator in the game (Naomi O'Bannion) */
    resourcesPerInvestigator: z.number().optional(),
    /** spend from the card's uses or the resource pool, the card first (Physical Training 4) */
    resourcesOrUses: z.number().optional(),
    discardFromHand: z.number().optional(),
  })
  .strict();
export type Cost = z.infer<typeof Cost>;

// ---------- conditions ----------
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { yourTurn: true }
  | { cluesOnYourLocation: "none" | "some" }
  | { youHaveClues: "none" | "some" }
  | { enemyAtYourLocation: CardFilter | true }
  | { enemyInPlay: CardFilter }
  | { exhaustedEnemyAtYourLocation: true }
  | { onlyEngagedEnemy: true }
  | { eventEnemy: CardFilter }
  | { eventInvestigatorIsYou: true }
  | { eventAtYourLocation: true }
  | { testKind: "investigate" | "fight" | "evade" }
  | { failedBy: { max: number } }
  | { succeededBy: { min: number } }
  | { tokenIs: ChaosToken[] }
  | { tokenNegative: true }
  | { resources: { min: number } }
  | { assetInPlay: CardFilter }
  | { controlsCard: string }
  | { scenarioFlag: string }
  | { phase: "mythos" | "investigation" | "enemy" | "upkeep" }
  | { controlled: boolean }
  | { exhausted: boolean }
  | { yourSkillTest: true }
  | { engaged: true }
  | { selfHasClues: true }
  | { eventCard: CardFilter }
  | { firstAction: true }
  | { eventSource: CardFilter }
  | { eventFromYourLocation: true }
  | { eventEnemyInPlay: true }
  | { enemyNearby: { range: number; nonElite?: boolean } }
  | { defeatedHealthThisTurn: { min: number } }
  | { testSource: CardFilter }
  | { remainingSanity: { max: number } }
  | { eventEnemyExhausted: true }
  | { eventEnemyAttackedYouThisRound: true }
  | { eventCardIsSelf: true }
  /** the enemy was defeated through a keyword (Under a Blood Moon: via the predator keyword) */
  | { defeatedVia: "predator" }
  | { canPay: Cost }
  /** how many cards lie beneath a card */
  | { beneath: { of: BeneathOf; min?: number; max?: number } }
  /** the horror on you */
  | { horror: { min?: number; max?: number } }
  /** named tokens held */
  | { tokens: { name: string; on: TokenHolder; min?: number; max?: number } }
  | { testTokens: ChaosToken[] }
  | { eventAtThisLocation: true }
  /** a condition a card or scenario script decides (`CardScript.conditions`) */
  | { script: string };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition) }).strict(),
    z.object({ any: z.array(Condition) }).strict(),
    z.object({ not: Condition }).strict(),
    z.object({ yourTurn: z.literal(true) }).strict(),
    z.object({ cluesOnYourLocation: z.enum(["none", "some"]) }).strict(),
    z.object({ youHaveClues: z.enum(["none", "some"]) }).strict(),
    z.object({ enemyAtYourLocation: z.union([CardFilter, z.literal(true)]) }).strict(),
    z.object({ enemyInPlay: CardFilter }).strict(),
    z.object({ exhaustedEnemyAtYourLocation: z.literal(true) }).strict(),
    z.object({ onlyEngagedEnemy: z.literal(true) }).strict(),
    z.object({ eventEnemy: CardFilter }).strict(),
    z.object({ eventInvestigatorIsYou: z.literal(true) }).strict(),
    z.object({ eventAtYourLocation: z.literal(true) }).strict(),
    z.object({ testKind: z.enum(["investigate", "fight", EVENT.Evade]) }).strict(),
    z.object({ failedBy: z.object({ max: z.number() }) }).strict(),
    z.object({ succeededBy: z.object({ min: z.number() }) }).strict(),
    z.object({ tokenIs: z.array(ChaosToken) }).strict(),
    z.object({ tokenNegative: z.literal(true) }).strict(),
    z.object({ resources: z.object({ min: z.number() }) }).strict(),
    z.object({ assetInPlay: CardFilter }).strict(),
    z.object({ controlsCard: z.string() }).strict(),
    z.object({ scenarioFlag: z.string() }).strict(),
    z
      .object({ phase: z.enum([PHASE.Mythos, PHASE.Investigation, ZONE.Enemy, PHASE.Upkeep]) })
      .strict(),
    z.object({ controlled: z.boolean() }).strict(),
    z.object({ exhausted: z.boolean() }).strict(),
    z.object({ yourSkillTest: z.literal(true) }).strict(),
    z.object({ engaged: z.literal(true) }).strict(),
    z.object({ selfHasClues: z.literal(true) }).strict(),
    z.object({ eventCard: CardFilter }).strict(),
    z.object({ firstAction: z.literal(true) }).strict(),
    z.object({ eventSource: CardFilter }).strict(),
    z.object({ eventFromYourLocation: z.literal(true) }).strict(),
    z.object({ eventEnemyInPlay: z.literal(true) }).strict(),
    z
      .object({ enemyNearby: z.object({ range: z.number(), nonElite: z.boolean().optional() }) })
      .strict(),
    z.object({ defeatedHealthThisTurn: z.object({ min: z.number() }) }).strict(),
    z.object({ testSource: CardFilter }).strict(),
    z.object({ remainingSanity: z.object({ max: z.number() }) }).strict(),
    z.object({ eventEnemyExhausted: z.literal(true) }).strict(),
    z.object({ eventEnemyAttackedYouThisRound: z.literal(true) }).strict(),
    z.object({ eventCardIsSelf: z.literal(true) }).strict(),
    z.object({ defeatedVia: z.literal("predator") }).strict(),
    z.object({ canPay: Cost }).strict(),
    z
      .object({
        beneath: z
          .object({ of: BeneathOf, min: z.number().optional(), max: z.number().optional() })
          .strict(),
      })
      .strict(),
    z
      .object({
        horror: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z
      .object({
        tokens: z
          .object({
            name: z.string(),
            on: TokenHolder,
            min: z.number().optional(),
            max: z.number().optional(),
          })
          .strict(),
      })
      .strict(),
    z.object({ testTokens: z.array(ChaosToken) }).strict(),
    z.object({ eventAtThisLocation: z.literal(true) }).strict(),
    z.object({ script: z.string() }).strict(),
  ]),
);

// ---------- effects ----------
export type Effect =
  | { op: "gainResources"; amount: Amount; target?: InvTarget }
  | { op: "loseResources"; amount: Amount; target?: InvTarget }
  | { op: "drawCards"; amount: Amount; target?: InvTarget }
  | {
      op: "discoverClues";
      amount: Amount;
      at?: "yourLocation" | "testLocation" | "yourOrConnecting";
    }
  | { op: "takeDamage"; amount: Amount; direct?: boolean; target?: InvTarget }
  | { op: "takeHorror"; amount: Amount; direct?: boolean; target?: InvTarget }
  | {
      op: "heal";
      damage?: number;
      horror?: number;
      target?: InvTarget;
      /** an Ally asset may be healed too: one at your location, or one you control */ targetAlly?:
        | "atLocation"
        | "controlled";
    }
  | { op: "dealDamage"; amount: Amount; to: EnemyTarget }
  | { op: "addDamage"; amount: number } // in a dealDamage window: damage being dealt to the enemy grows
  | {
      op: "placeDoom";
      amount: Amount;
      on: "agenda" | "self" | "nearestCultist" | "nearestEnemy" | "eachCultist";
    }
  | {
      op: "placeTokens";
      /** this card, you, or your location; `you` and `yourLocation` take named tokens only */
      on: TokenHolder;
      clues?: number;
      horror?: number;
      damage?: Amount;
      doom?: number;
      resources?: number;
      /** named tokens (wards, scrap, seals): `amount` of them by this name */
      name?: string;
      amount?: Amount;
    }
  | { op: "putInThreatArea" }
  | { op: "attachToLocation"; where: "yours" | "mostClues"; limitOnePerLocation?: boolean }
  | { op: "discardSelf" }
  | { op: "addSelfToVictory" }
  | { op: "removeSelf" }
  | {
      op: "skillTest";
      skill: Skill | Skill[];
      difficulty: number;
      onSuccess?: Effect[];
      onFail?: Effect[];
      perPointFailed?: Effect[];
    }
  | {
      op: "fight";
      target?: EnemyTarget;
      auto?: boolean;
      skill?: Skill;
      bonus?: number;
      damageBonus?: number;
      onSuccess?: Effect[];
      onFail?: Effect[];
      onTokens?: OnTokens;
      extraDamageIf?: Condition;
      extraDamageIfSucceedBy?: number;
      /** damage by the margin: +1 per point succeeded by up to `max` (or, `instead`, 1 per point, at least 1, at most `max`, in place of the standard 1); a failure that damages another investigator deals 1 per point failed by, at most `max` */
      damagePerMargin?: { max: number; instead?: boolean; failMax?: number };
      /** after a success, before the damage: pay `cost` for more (Sledgehammer, Cosmic Flame) */
      boost?: Boost;
      /** when the attack defeats its enemy (Decisive Strike) */
      onDefeat?: Effect[];
    }
  | {
      op: "investigate";
      skill?: Skill;
      bonus?: Amount;
      /** a revealed connecting location of your choice instead of yours (Local Map) */
      at?: "connecting";
      boost?: Boost;
      shroud?: number;
      insteadOfClues?: Effect[];
      onSuccess?: Effect[];
      onFail?: Effect[];
      onTokens?: OnTokens;
    }
  | {
      op: "evade";
      skill?: Skill;
      bonus?: Amount;
      onSuccess?: Effect[];
      onFail?: Effect[];
      auto?: boolean;
      all?: boolean;
      nonElite?: boolean;
      onTokens?: OnTokens;
    }
  | {
      op: "modify";
      mod: Modifier;
      until: z.infer<typeof Duration>;
      target?: InvTarget;
      /** the modifier is on your location instead (Hand-Crank Flashlight) */
      on?: "yourLocation";
    }
  | {
      op: "chooseOne";
      options: { label: string; effects: Effect[]; condition?: Condition }[];
      chooser?: "you" | "lead";
    }
  | { op: "discardFromHand"; amount: Amount; random?: boolean; target?: InvTarget }
  | { op: "discardAsset"; orElse?: Effect[] }
  | { op: "discardAllButOneFromHand" }
  | { op: "removeDiscardFromGame" }
  | { op: "drawEncounterCard" }
  | {
      op: "gainActions";
      amount: number;
      /** the action can only be used for this kind of action */ onlyFor?: string;
    }
  | { op: "cancel" } // cancel the triggering attack/revelation/token
  | { op: "disengageAll"; nonTrait?: string }
  | {
      op: "moveTo";
      where:
        | "connecting"
        | "connectingRevealed"
        | "revealedWithin2"
        | "revealedNoEnemies"
        | "central"
        | "choose"
        | "eventLocation";
    }
  /** `draw`: the card found is drawn (a weakness resolves), not just added to the hand */
  | {
      op: "searchDeck";
      top?: number;
      filter: CardFilter;
      amount?: number;
      target?: InvTarget;
      draw?: boolean;
      /** the weaknesses among the searched cards are drawn too (Mysterious Grimoire) */
      drawWeaknesses?: boolean;
      /** if no card was taken, draw 1 card (Ye Olde Magick Shoppe) */
      orDraw?: boolean;
    }
  /** `anyDeck`: any investigator's deck or the encounter deck (Scrying); the cards go back on top in the order chosen */
  | { op: "lookAtTop"; amount: number; anyDeck?: boolean }
  | { op: "addUses"; amount: number; filter: CardFilter }
  | { op: "surge" }
  | { op: "drawCultistOrSearch" } // Mysterious Chanting fallback
  | { op: "spawnSetAside"; code: string; at?: string }
  | { op: "putSetAsideIntoPlay"; code: string }
  | { op: "shuffleIntoEncounterDeck"; target: "eventEnemy" }
  | { op: "takeControl" }
  | { op: "resolution"; id: string }
  | { op: "resign" }
  | { op: "takeFromDiscard"; filter: CardFilter }
  /** `zones`: where to look, in order (the encounter deck and its discard by default; the void when the card says) */
  | { op: "searchEncounterDraw"; filter: CardFilter; zones?: ("deck" | "discard" | "void")[] }
  | { op: "preventDamage"; amount: number; kind: "damage" | "horror" | "either" } // in an attackDealsDamage window: cancel points of what the attack just dealt
  | {
      op: "discardEncounterUntil";
      filter: CardFilter;
      count?: number;
      countIfPlayersAtLeast?: [number, number];
      then: "leadDraws" | "youDraw" | "spawnAt";
      at?: string;
      doom?: number;
      shuffleDiscardFirst?: boolean;
    }
  | { op: "dropClues"; amount: Amount }
  | { op: "spendClues"; amount: Amount }
  | { op: "healEnemy"; amount: number }
  /** move a non-Elite enemy within range to your location, engage it, then resolve `then` with it as the event enemy */
  | { op: "pullEnemy"; range: number; nonElite?: boolean; then: Effect[] }
  /** engage enemies at your location one at a time, `each` resolving for every one engaged; `done` is internal */
  | { op: "engageAny"; each: Effect[]; done?: string[] }
  | { op: "readyCard"; filter: CardFilter }
  /** choose a card of your deck or discard pile that you can afford, play it, shuffle the deck */
  | {
      op: "searchAndPlay";
      filter: CardFilter;
      costMod?: number;
      deckOnly?: boolean;
      discardOnly?: boolean;
    }
  | { op: "checkDoom" }
  | { op: "returnSelfToHand" }
  /** spend uses from the source, or resolve `orElse` when it hasn't enough (Cosmic Flame's backlash) */
  | { op: "removeUses"; amount: number; orElse?: Effect[] }
  /** pay a cost of the source card, if it can be paid (an optional follow-up of an ability) */
  | { op: "payCost"; cost: Cost }
  | { op: "shuffleSelfIntoDeck" }
  /** heal the source card itself (Aleksey Saburov): a choice when both are possible */
  | { op: "healSelf"; damage?: number; horror?: number }
  /** the event enemy does not ready during the next upkeep phase (Slippery) */
  | { op: "skipNextReady" }
  | /** one of your bonded cards (of this code) from where it waits set aside into play */ {
      op: "putBondedIntoPlay";
      code?: string;
    }
  | /** one of your bonded cards (of this code) from where it waits set aside into your hand */ {
      op: "putBondedInHand";
      code?: string;
    }
  | /** this card leaves the game and its owner's campaign deck */ { op: "exile" }
  | /** the top cards of your deck facedown beneath this enemy (or the enemy of the event) as swarm cards */ {
      op: "addSwarm";
      amount: Amount;
    }
  | /** the scenario pauses on one of its interludes: its text and choices, the answer recorded for the campaign log */ {
      op: "readInterlude";
      id: string;
    }
  | /** named tokens moved from one holder to another */ {
      op: "moveTokens";
      name: string;
      amount: Amount;
      from: TokenHolder;
      to: TokenHolder;
    }
  | /** named tokens taken off a card or you */ {
      op: "removeTokens";
      name: string;
      amount: Amount;
      on: TokenHolder;
    }
  | /** this location (or your location) leaves play: its investigators defeated, or moved to `to` (a location name) */ {
      op: "removeLocation";
      location?: "self" | "yourLocation";
      to?: string;
    }
  | /** a card of this code in the void comes back: an enemy spawns (at `at`, a location name, else as its spawn says) */ {
      op: "fromVoid";
      code: string;
      at?: string;
    }
  | /** this card leaves play to the void, keeping its attachments and tokens */ { op: "toVoid" }
  | /** every card beneath a card moved elsewhere */ {
      op: "moveBeneath";
      from: BeneathOf;
      to: "encounterDeck" | "encounterDiscard" | "setAside" | "removed";
    }
  | /** the pile beneath a card shuffled */ { op: "shuffleBeneath"; of: BeneathOf }
  | /** the top card beneath a card turned faceup, staying there */ {
      op: "revealBeneath";
      from: BeneathOf;
    }
  | /** the top card beneath a card (or one at random) drawn by you as an encounter card */ {
      op: "drawBeneath";
      from: BeneathOf;
      random?: boolean;
    }
  | /** a card (this one, or a set-aside card of that code) facedown beneath another, at the bottom of its pile */ {
      op: "putBeneath";
      under: BeneathOf;
      card?: string;
    }
  | /** resolve this card's story face (turning it to that face first when `flip`) */ {
      op: "resolveStory";
      flip?: boolean;
    }
  | /** this card becomes a set-aside card of `with` (its tokens kept), that copy leaving the game (the Bystander swap) */ {
      op: "swap";
      with: string;
    }
  | /** turn the card (this one) to its other printed face */ { op: "flip" }
  | /** an act or agenda deck back to its first card, the others in order beneath it (Children of Blood) */ {
      op: "resetDeck";
      kind: "act" | "agenda";
      deck?: string;
    }
  /** effects that resolve when your turn ends (Prestidigitation, "Shove off!") */
  | { op: "atTurnEnd"; effects: Effect[] }
  | { op: "script"; fn: string; args?: unknown };

/** extra effects if any of the listed tokens was revealed during the test */
export type OnTokens = { tokens: ChaosToken[]; effects: Effect[] };
export type Boost = { cost: Cost; damage?: number; clues?: number; effects?: Effect[] };
const effectsArr = (): z.ZodType<Effect[]> => z.array(Effect);
const OnTokens = (): z.ZodType<OnTokens> =>
  z.object({ tokens: z.array(ChaosToken), effects: effectsArr() }).strict();
const Boost = (): z.ZodType<Boost> =>
  z
    .object({
      cost: Cost,
      damage: z.number().optional(),
      clues: z.number().optional(),
      effects: effectsArr().optional(),
    })
    .strict();
export const Effect: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z
      .object({ op: z.literal("gainResources"), amount: Amount, target: InvTarget.optional() })
      .strict(),
    z
      .object({ op: z.literal("loseResources"), amount: Amount, target: InvTarget.optional() })
      .strict(),
    z.object({ op: z.literal("drawCards"), amount: Amount, target: InvTarget.optional() }).strict(),
    z
      .object({
        op: z.literal("discoverClues"),
        amount: Amount,
        at: z.enum(["yourLocation", "testLocation", "yourOrConnecting"]).optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("takeDamage"),
        amount: Amount,
        direct: z.boolean().optional(),
        target: InvTarget.optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("takeHorror"),
        amount: Amount,
        direct: z.boolean().optional(),
        target: InvTarget.optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal(EVENT.Heal),
        damage: z.number().optional(),
        horror: z.number().optional(),
        target: InvTarget.optional(),
        targetAlly: z.enum(["atLocation", "controlled"]).optional(),
      })
      .strict(),
    z.object({ op: z.literal("dealDamage"), amount: Amount, to: EnemyTarget }).strict(),
    z.object({ op: z.literal("addDamage"), amount: z.number() }).strict(),
    z
      .object({
        op: z.literal("placeDoom"),
        amount: Amount,
        on: z.enum([EVENT.Agenda, "self", "nearestCultist", "nearestEnemy", "eachCultist"]),
      })
      .strict(),
    z
      .object({
        op: z.literal("placeTokens"),
        on: TokenHolder,
        clues: z.number().optional(),
        horror: z.number().optional(),
        damage: Amount.optional(),
        doom: z.number().optional(),
        resources: z.number().optional(),
        name: z.string().optional(),
        amount: Amount.optional(),
      })
      .strict(),
    z.object({ op: z.literal("putInThreatArea") }).strict(),
    z
      .object({
        op: z.literal("attachToLocation"),
        where: z.enum(["yours", "mostClues"]),
        limitOnePerLocation: z.boolean().optional(),
      })
      .strict(),
    z.object({ op: z.literal("discardSelf") }).strict(),
    z.object({ op: z.literal("addSelfToVictory") }).strict(),
    z.object({ op: z.literal("removeSelf") }).strict(),
    z
      .object({
        op: z.literal("skillTest"),
        skill: z.union([Skill, z.array(Skill)]),
        difficulty: z.number(),
        onSuccess: effectsArr().optional(),
        onFail: effectsArr().optional(),
        perPointFailed: effectsArr().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("fight"),
        target: EnemyTarget.optional(),
        auto: z.boolean().optional(),
        skill: Skill.optional(),
        bonus: z.number().optional(),
        damageBonus: z.number().optional(),
        onSuccess: effectsArr().optional(),
        onFail: effectsArr().optional(),
        onTokens: OnTokens().optional(),
        extraDamageIf: Condition.optional(),
        extraDamageIfSucceedBy: z.number().optional(),
        damagePerMargin: z
          .object({
            max: z.number(),
            instead: z.boolean().optional(),
            failMax: z.number().optional(),
          })
          .optional(),
        boost: Boost().optional(),
        onDefeat: effectsArr().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("investigate"),
        skill: Skill.optional(),
        bonus: Amount.optional(),
        at: z.literal("connecting").optional(),
        boost: Boost().optional(),
        shroud: z.number().optional(),
        insteadOfClues: effectsArr().optional(),
        onSuccess: effectsArr().optional(),
        onFail: effectsArr().optional(),
        onTokens: OnTokens().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal(EVENT.Evade),
        skill: Skill.optional(),
        bonus: Amount.optional(),
        onSuccess: effectsArr().optional(),
        onFail: effectsArr().optional(),
        auto: z.boolean().optional(),
        all: z.boolean().optional(),
        nonElite: z.boolean().optional(),
        onTokens: OnTokens().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal(EVENT.Modify),
        mod: Modifier,
        until: Duration,
        target: InvTarget.optional(),
        on: z.literal("yourLocation").optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("chooseOne"),
        options: z.array(
          z
            .object({ label: z.string(), effects: effectsArr(), condition: Condition.optional() })
            .strict(),
        ),
        chooser: z.enum(["you", EVENT.Lead]).optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("discardFromHand"),
        amount: Amount,
        random: z.boolean().optional(),
        target: InvTarget.optional(),
      })
      .strict(),
    z.object({ op: z.literal("discardAsset"), orElse: effectsArr().optional() }).strict(),
    z.object({ op: z.literal("discardAllButOneFromHand") }).strict(),
    z.object({ op: z.literal("removeDiscardFromGame") }).strict(),
    z.object({ op: z.literal("drawEncounterCard") }).strict(),
    z
      .object({ op: z.literal("gainActions"), amount: z.number(), onlyFor: z.string().optional() })
      .strict(),
    z.object({ op: z.literal("cancel") }).strict(),
    z.object({ op: z.literal("disengageAll"), nonTrait: z.string().optional() }).strict(),
    z
      .object({
        op: z.literal("moveTo"),
        where: z.enum([
          "connecting",
          "connectingRevealed",
          "revealedWithin2",
          "revealedNoEnemies",
          "central",
          "choose",
          "eventLocation",
        ]),
      })
      .strict(),
    z
      .object({
        op: z.literal("searchDeck"),
        top: z.number().optional(),
        filter: CardFilter,
        amount: z.number().optional(),
        target: InvTarget.optional(),
        draw: z.boolean().optional(),
        drawWeaknesses: z.boolean().optional(),
        orDraw: z.boolean().optional(),
      })
      .strict(),
    z
      .object({ op: z.literal("lookAtTop"), amount: z.number(), anyDeck: z.boolean().optional() })
      .strict(),
    z.object({ op: z.literal("addUses"), amount: z.number(), filter: CardFilter }).strict(),
    z.object({ op: z.literal("surge") }).strict(),
    z.object({ op: z.literal("drawCultistOrSearch") }).strict(),
    z
      .object({ op: z.literal("spawnSetAside"), code: z.string(), at: z.string().optional() })
      .strict(),
    z.object({ op: z.literal("putSetAsideIntoPlay"), code: z.string() }).strict(),
    z
      .object({ op: z.literal("shuffleIntoEncounterDeck"), target: z.literal("eventEnemy") })
      .strict(),
    z.object({ op: z.literal("takeControl") }).strict(),
    z.object({ op: z.literal(EVENT.Resolution), id: z.string() }).strict(),
    z.object({ op: z.literal(EVENT.Resign) }).strict(),
    z.object({ op: z.literal("takeFromDiscard"), filter: CardFilter }).strict(),
    z
      .object({
        op: z.literal("searchEncounterDraw"),
        filter: CardFilter,
        zones: z.array(z.enum(["deck", "discard", "void"])).optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("preventDamage"),
        amount: z.number(),
        kind: z.enum([EVENT.Damage, "horror", "either"]),
      })
      .strict(),
    z
      .object({
        op: z.literal("discardEncounterUntil"),
        filter: CardFilter,
        count: z.number().optional(),
        countIfPlayersAtLeast: z.tuple([z.number(), z.number()]).optional(),
        then: z.enum(["leadDraws", "youDraw", "spawnAt"]),
        at: z.string().optional(),
        doom: z.number().optional(),
        shuffleDiscardFirst: z.boolean().optional(),
      })
      .strict(),
    z.object({ op: z.literal("dropClues"), amount: Amount }).strict(),
    z.object({ op: z.literal("spendClues"), amount: Amount }).strict(),
    z.object({ op: z.literal("healEnemy"), amount: z.number() }).strict(),
    z
      .object({
        op: z.literal("pullEnemy"),
        range: z.number(),
        nonElite: z.boolean().optional(),
        then: effectsArr(),
      })
      .strict(),
    z
      .object({
        op: z.literal("engageAny"),
        each: effectsArr(),
        done: z.array(z.string()).optional(),
      })
      .strict(),
    z.object({ op: z.literal("readyCard"), filter: CardFilter }).strict(),
    z
      .object({
        op: z.literal("searchAndPlay"),
        filter: CardFilter,
        costMod: z.number().optional(),
        deckOnly: z.boolean().optional(),
        discardOnly: z.boolean().optional(),
      })
      .strict(),
    z.object({ op: z.literal("checkDoom") }).strict(),
    z.object({ op: z.literal("returnSelfToHand") }).strict(),
    z
      .object({ op: z.literal("removeUses"), amount: z.number(), orElse: effectsArr().optional() })
      .strict(),
    z.object({ op: z.literal("payCost"), cost: Cost }).strict(),
    z.object({ op: z.literal("shuffleSelfIntoDeck") }).strict(),
    z
      .object({
        op: z.literal("healSelf"),
        damage: z.number().optional(),
        horror: z.number().optional(),
      })
      .strict(),
    z.object({ op: z.literal("skipNextReady") }).strict(),
    z.object({ op: z.literal("putBondedIntoPlay"), code: z.string().optional() }).strict(),
    z.object({ op: z.literal("putBondedInHand"), code: z.string().optional() }).strict(),
    z.object({ op: z.literal("exile") }).strict(),
    z.object({ op: z.literal("addSwarm"), amount: Amount }).strict(),
    z.object({ op: z.literal("readInterlude"), id: z.string() }).strict(),
    z
      .object({
        op: z.literal("moveTokens"),
        name: z.string(),
        amount: Amount,
        from: TokenHolder,
        to: TokenHolder,
      })
      .strict(),
    z
      .object({ op: z.literal("removeTokens"), name: z.string(), amount: Amount, on: TokenHolder })
      .strict(),
    z
      .object({
        op: z.literal("removeLocation"),
        location: z.enum(["self", "yourLocation"]).optional(),
        to: z.string().optional(),
      })
      .strict(),
    z.object({ op: z.literal("fromVoid"), code: z.string(), at: z.string().optional() }).strict(),
    z.object({ op: z.literal("toVoid") }).strict(),
    z
      .object({
        op: z.literal("moveBeneath"),
        from: BeneathOf,
        to: z.enum(["encounterDeck", "encounterDiscard", "setAside", "removed"]),
      })
      .strict(),
    z.object({ op: z.literal("shuffleBeneath"), of: BeneathOf }).strict(),
    z.object({ op: z.literal("revealBeneath"), from: BeneathOf }).strict(),
    z
      .object({ op: z.literal("drawBeneath"), from: BeneathOf, random: z.boolean().optional() })
      .strict(),
    z
      .object({ op: z.literal("putBeneath"), under: BeneathOf, card: z.string().optional() })
      .strict(),
    z.object({ op: z.literal("resolveStory"), flip: z.boolean().optional() }).strict(),
    z.object({ op: z.literal("swap"), with: z.string() }).strict(),
    z.object({ op: z.literal("flip") }).strict(),
    z
      .object({
        op: z.literal("resetDeck"),
        kind: z.enum(["act", "agenda"]),
        deck: z.string().optional(),
      })
      .strict(),
    z.object({ op: z.literal("atTurnEnd"), effects: effectsArr() }).strict(),
    z.object({ op: z.literal("script"), fn: z.string(), args: z.unknown().optional() }).strict(),
  ]),
);
export const EFFECT_OPS = [
  "gainResources",
  "loseResources",
  "drawCards",
  "discoverClues",
  "takeDamage",
  "takeHorror",
  "heal",
  "dealDamage",
  "addDamage",
  "placeDoom",
  "placeTokens",
  "putInThreatArea",
  "attachToLocation",
  "discardSelf",
  "addSelfToVictory",
  "removeSelf",
  "skillTest",
  "fight",
  "investigate",
  "evade",
  "modify",
  "chooseOne",
  "discardFromHand",
  "discardAsset",
  "discardAllButOneFromHand",
  "removeDiscardFromGame",
  "drawEncounterCard",
  "gainActions",
  "cancel",
  "disengageAll",
  "moveTo",
  "searchDeck",
  "lookAtTop",
  "addUses",
  "surge",
  "drawCultistOrSearch",
  "spawnSetAside",
  "putSetAsideIntoPlay",
  "shuffleIntoEncounterDeck",
  "takeControl",
  "resolution",
  "resign",
  "checkDoom",
  "takeFromDiscard",
  "searchEncounterDraw",
  "preventDamage",
  "discardEncounterUntil",
  "dropClues",
  "spendClues",
  "healEnemy",
  "pullEnemy",
  "engageAny",
  "readyCard",
  "searchAndPlay",
  "returnSelfToHand",
  "removeUses",
  "payCost",
  "shuffleSelfIntoDeck",
  "healSelf",
  "skipNextReady",
  "putBondedIntoPlay",
  "putBondedInHand",
  "exile",
  "addSwarm",
  "readInterlude",
  "moveTokens",
  "removeTokens",
  "removeLocation",
  "fromVoid",
  "toVoid",
  "moveBeneath",
  "shuffleBeneath",
  "revealBeneath",
  "drawBeneath",
  "putBeneath",
  "resolveStory",
  "swap",
  "flip",
  "resetDeck",
  "atTurnEnd",
  "script",
] as const;

// ---------- abilities ----------
export const TRIGGERS = [
  // investigator-side
  "enemyDefeated",
  "successfulInvestigate",
  "successfulAttack",
  "skillTestFailed",
  "skillTestSucceeded",
  "wouldFailSkillTest",
  "tokenRevealed",
  "enemyAttacks",
  "enemyAttacked",
  "enemyEvaded",
  "horrorPlaced",
  "damageTaken",
  "horrorTaken",
  "enterPlay",
  "cardPlayed",
  "treacheryDrawn",
  "enemySpawns",
  "phaseBegins",
  "turnBegins",
  "turnEnds",
  "roundEnds",
  "attackDealsDamage",
  "mythosEnds",
  "enemyPhaseEnds",
  "enterLocation",
  /** a location's "after you reveal this location", after its clues are placed */
  "revealed",
  /** before an investigator or an enemy is defeated: a replacement cancels it (`cancel`) and does something else */
  "wouldBeDefeated",
  "leaveLocation",
  "locationInvestigated",
  "assetDamaged",
  "enemyEngages",
  "enemyDefeatedSelf",
  "playerWindow",
  "successfulEvade",
  "dealDamage",
  "excessDamage",
  "wouldMoveOut",
  "agendaAdvances",
  "wouldDiscoverClues",
  "skillTestEnds",
  "wouldRevealToken",
  "cardDrawn",
  /** an enemy moved into or spawned at a location (`location`) */
  "enemyEntersLocation",
  /** an asset is defeated: it is still in play while the window is open */
  "assetDefeated",
  "horrorOnAsset",
  /** after an investigator takes damage and/or horror (one window for both) */
  "damageOrHorrorTaken",
  "phaseEnds",
  "resourcesSpent",
  /** after an investigator's damage is placed on an enemy */
  "enemyDamaged",
  /** after an investigator discovers clues (`location`, `amount`) */
  "cluesDiscovered",
  /** after doom is placed on a card (`card`) */
  "doomPlaced",
  /** damage and/or horror is about to be placed on an investigator, from any source (`key`, `damage`, `horror`) */
  "damageDealt",
  /** after an effect heals horror (`inv`: whose effect, `card`: the healed investigator or asset, `by`: the effect's card, `amount`) */
  "horrorHealed",
] as const;
export const Trigger = z.enum(TRIGGERS);
export type Trigger = z.infer<typeof Trigger>;

export const AbilityKind = z.enum([
  EVENT.Action,
  "fast",
  CHOICE.Reaction,
  "forced",
  "constant",
  "revelation",
  "onPlay",
  "elderSign",
]);
export type AbilityKind = z.infer<typeof AbilityKind>;

export const Ability = z
  .object({
    kind: AbilityKind,
    label: z.string().optional(),
    /** for reaction/forced */
    trigger: Trigger.optional(),
    /** action designator, e.g. fight/investigate (counts as that action for AoO and effects) */
    designator: z
      .enum(["fight", "investigate", EVENT.Evade, "parley", EVENT.Resign, EVENT.Move, EVENT.Engage])
      .optional(),
    actionCost: z.number().optional(), // default 1 for kind=action
    cost: Cost.optional(),
    limit: z
      .object({
        per: z.enum(["test", EVENT.Turn, EVENT.Phase, "round", "game"]),
        count: z.number().default(1),
        group: z.boolean().optional(),
      })
      .optional(),
    condition: Condition.optional(),
    effects: z.array(Effect).optional(),
    modifiers: z.array(Modifier).optional(),
    /** who may use it: controller only (default), any investigator at the card's location */
    usableBy: z.enum(["controller", "atLocation", "anyone", "engaged"]).optional(),
    /** for elderSign kind: token modifier */
    tokenValue: z.union([z.number(), z.enum(["cluesOnLocation", "horrorOnYou"])]).optional(),
    /** reaction triggers from hand for fast events (Dodge, Lucky!) */
    fromHand: z.boolean().optional(),
    /** false: using it provokes no attack of opportunity whatever its designator (Mano a Mano) */
    aoo: z.boolean().optional(),
    /** a fast event playable in any player window (ADR-0014) */
    anyWindow: z.boolean().optional(),
    /** a reaction on a card in hand that is used, not played (Detective's Intuition) */
    revealOnly: z.boolean().optional(),
  })
  .strict();
export type Ability = z.infer<typeof Ability>;

// ---------- cards ----------
export const Icons = z
  .object({
    willpower: z.number(),
    intellect: z.number(),
    combat: z.number(),
    agility: z.number(),
    wild: z.number(),
  })
  .partial();

/**
 * Where an enemy spawns, as an expression: locations narrowed by name, trait, empty, connected to the drawer's location;
 * the nearest or farthest of them to the drawer (or to a card of a code or trait); unrevealed ones if any; or the
 * candidates of several expressions. The drawer chooses among what is left.
 */
export type Spawn =
  | string
  | {
      name?: string;
      trait?: string;
      empty?: boolean;
      /** with no Elite enemy there */
      noElite?: boolean;
      /** with clues on it */
      clues?: boolean;
      /** with an enemy of this trait there (Patrol (nearest [[Civilian]] enemy)) */
      enemyTrait?: string;
      connected?: boolean;
      nearest?: boolean;
      farthest?: boolean;
      to?: "you" | { code: string } | { trait: string };
      unrevealed?: "ifAble";
      or?: Spawn[];
    };
export const Spawn: z.ZodType<Spawn> = z.lazy(() =>
  z.union([
    z.string(),
    z
      .object({
        name: z.string().optional(),
        trait: z.string().optional(),
        empty: z.boolean().optional(),
        noElite: z.boolean().optional(),
        clues: z.boolean().optional(),
        enemyTrait: z.string().optional(),
        connected: z.boolean().optional(),
        nearest: z.boolean().optional(),
        farthest: z.boolean().optional(),
        to: z
          .union([
            z.literal("you"),
            z.object({ code: z.string() }).strict(),
            z.object({ trait: z.string() }).strict(),
          ])
          .optional(),
        unrevealed: z.literal("ifAble").optional(),
        or: z.array(Spawn).optional(),
      })
      .strict(),
  ]),
);

/** the keywords the engine acts on by themselves */
export const PLAIN_KEYWORDS = [
  "hunter",
  EVENT.Retaliate,
  "aloof",
  EVENT.Alert,
  "massive",
  "surge",
  "peril",
  "fast",
  "exceptional",
  "doomed",
  EVENT.Elusive,
  /** an asset at a location the investigators get in and out of (Fishing Vessel, the Rocket Ship) */
  "vehicle",
  /** a treachery that goes into the drawer's hand (Whispers in Your Head) */
  "hidden",
  /** after its enemy-phase attack it readies and attacks again */
  "relentless",
  /** a location an investigator may flip to its story side when it has no clues */
  "veiled",
  /** a player card that leaves the campaign deck when its effect exiles it */
  "exile",
  /** after enemies attack, it attacks a non-Elite enemy at its location (Children of Blood) */
  "predator",
] as const;
/**
 * A keyword: a plain one, or one with its argument as data (ADR-0013): Patrol's target as a spawn expression, Swarming's
 * number, the code a bonded card belongs to, the trait a predator hunts, the log entry a researched card needs.
 */
export const Keyword = z.union([
  z.enum(PLAIN_KEYWORDS),
  z.object({ patrol: Spawn }).strict(),
  z.object({ swarming: Amount }).strict(),
  z.object({ bonded: z.string() }).strict(),
  /** a predator that hunts only enemies of this trait */
  z.object({ predator: z.string() }).strict(),
  z.object({ researched: z.object({ log: z.string() }).strict() }).strict(),
]);
export type Keyword = z.infer<typeof Keyword>;
/** a keyword's name: the plain keyword, or the key of one with an argument */
export const keywordName = (k: Keyword): string => (typeof k === "string" ? k : Object.keys(k)[0]);

export const CardDef = z
  .object({
    code: z.string(),
    name: z.string(),
    subname: z.string().optional(),
    backName: z.string().optional(),
    type: CardType,
    subtype: z.enum([EVENT.Weakness, "basicweakness"]).optional(),
    faction: z.string(),
    /** every class of a multi-class card (faction first); absent on a single-class card */
    factions: z.array(z.string()).optional(),
    pack: z.string(),
    encounterSet: z.string().optional(),
    quantity: z.number().default(1),
    deckLimit: z.number().optional(),
    xp: z.number().optional(),
    /** null: no cost printed; "X": the text defines it */
    cost: z
      .union([z.number(), z.literal("X")])
      .nullable()
      .optional(),
    traits: z.array(z.string()).default([]),
    icons: Icons.default({}),
    slots: z.array(Slot).default([]),
    unique: z.boolean().default(false),
    /** ArkhamDB's tags (heals horror, heals damage, ...): what some deckbuilding options name */
    tags: z.array(z.string()).optional(),
    text: z.string().default(""),
    backText: z.string().optional(),
    flavor: z.string().optional(),
    doubleSided: z.boolean().default(false),
    /** the code of its other printed face, a card of its own in ArkhamDB (`03078` → `03078b`); set by the loader */
    back: z.string().optional(),
    /** on a `b` face: the code of the face it is the back of; set by the loader. A back is never a deck card */
    front: z.string().optional(),
    /** a story card: what it does once resolved */
    story: z
      .object({ after: z.enum(["flipBack", "remove", "stay"]) })
      .strict()
      .optional(),
    /** what lies beneath it when it leaves play: discarded (the default) or kept with it */
    beneathOnLeave: z.enum(["discard", "stay"]).optional(),
    // asset / investigator
    health: z.number().optional(),
    sanity: z.number().optional(),
    uses: z.object({ type: z.string(), count: z.number() }).optional(),
    skills: z
      .object({
        willpower: z.number(),
        intellect: z.number(),
        combat: z.number(),
        agility: z.number(),
      })
      .optional(),
    // enemy (null: no printed value, or one the text defines — the enemy can't be fought / evaded / defeated by damage)
    enemy: z
      .object({
        fight: z.number().nullable(),
        health: z.number().nullable(),
        healthPerInvestigator: z.boolean().default(false),
        evade: z.number().nullable(),
        damage: z.number(),
        horror: z.number(),
      })
      .optional(),
    /** a location name, "emptyLocation", "farthestEmptyLocation", "Engaged with Prey", or an expression */
    spawn: Spawn.optional(),
    prey: z
      .union([
        z.object({
          highest: z.enum([
            "willpower",
            "intellect",
            "combat",
            "agility",
            EVENT.Clues,
            "remainingHealth",
            "remainingSanity",
            "cardsInHand",
            "resources",
          ]),
        }),
        z.object({
          lowest: z.enum([
            "willpower",
            "intellect",
            "combat",
            "agility",
            EVENT.Clues,
            "remainingHealth",
            "remainingSanity",
            "cardsInHand",
          ]),
        }),
        z.literal("bearer"),
        /** only this investigator (by card code) is prey: Tommy Malloy */
        z.object({ only: z.string() }),
        /** the investigator nearest to a card in play matching the filter */
        z.object({ nearestTo: CardFilter }),
      ])
      .optional(),
    // location (shroud null: the text defines it; the location can't be investigated)
    shroud: z.number().nullable().optional(),
    clues: z.number().optional(),
    cluesPerInvestigator: z.boolean().optional(),
    // act/agenda
    stage: z.number().optional(),
    doom: z.number().optional(),
    actClues: z.number().optional(),
    actCluesPerInvestigator: z.boolean().optional(),
    /** when the group may spend clues to advance this act (default: any time during a turn) */
    actAdvance: z.enum([EVENT.Turn, "script"]).optional(),
    /** clues the group spends, per investigator, to enter it while unrevealed (Underground Cistern) */
    enterCluesPerInvestigator: z.number().optional(),
    /** location investigated with a different skill */
    investigateSkill: Skill.optional(),
    victory: z.number().optional(),
    /** Vengeance X: the vengeance points it adds to the campaign while in the victory display (The Forgotten Age) */
    vengeance: z.number().optional(),
    keywords: z.array(Keyword).default([]),
    /** wild/limits */
    maxCommitted: z.number().optional(),
    /** discard the asset when its last use is spent (First Aid, Forbidden Knowledge) */
    discardWhenEmpty: z.boolean().optional(),
    /** its uses are restored to the printed count at the start of each round */
    replenish: z.literal("round").optional(),
    commitOnlyOwnTest: z.boolean().optional(),
    /** horror its committer takes as an additional cost to commit it (Soul Link) */
    commitHorror: z.number().optional(),
    /** may be committed after the chaos tokens are revealed, to a test you perform (Timely Intervention) */
    commitAfterReveal: z.boolean().optional(),
    /** may be assigned damage dealt to other investigators at its controller's location (Bodyguard) */
    soaksForLocation: z.boolean().optional(),
    abilities: z.array(Ability).default([]),
    /** card behavior implemented in content/**\/scripts/<code>.ts */
    script: z.boolean().optional(),
    image: z.string().optional(),
    backImage: z.string().optional(),
  })
  .strict();
export type CardDef = z.infer<typeof CardDef>;
export type CardDefInput = z.input<typeof CardDef>;

/** hand-written overrides: any CardDef field except code */
export const CardOverride = CardDef.partial().omit({ code: true }).strict();
export type CardOverride = z.infer<typeof CardOverride>;

// ---------- investigators & decks ----------
/** one deckbuilding option in the snapshot's grammar; a key the importer does not know is kept under `raw` */
export const DeckOption = z
  .object({
    faction: z.array(z.string()).optional(),
    level: z.object({ min: z.number(), max: z.number() }).optional(),
    base_level: z.object({ min: z.number(), max: z.number() }).optional(),
    trait: z.array(z.string()).optional(),
    tag: z.array(z.string()).optional(),
    type: z.array(z.string()).optional(),
    name: z.string().optional(),
    text: z.array(z.string()).optional(),
    uses: z.array(z.string()).optional(),
    limit: z.number().optional(),
    atleast: z.object({ factions: z.number(), min: z.number() }).optional(),
    not: z.boolean().optional(),
    permanent: z.boolean().optional(),
    ignore_match: z.boolean().optional(),
    error: z.string().optional(),
    id: z.string().optional(),
    faction_select: z.array(z.string()).optional(),
    option_select: z.array(z.record(z.string(), z.unknown())).optional(),
    deck_size_select: z.array(z.string()).optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type DeckOption = z.infer<typeof DeckOption>;

export const InvestigatorDef = z
  .object({
    code: z.string(),
    /** shown by the picker before the investigator's pack is loaded (generated definitions) */
    name: z.string().optional(),
    subname: z.string().optional(),
    faction: z.string().optional(),
    pack: z.string().optional(),
    generated: z.boolean().optional(),
    /** the name in each other language, for the picker before the investigator's pack (and its text) is loaded */
    names: z
      .record(z.string(), z.object({ name: z.string(), subname: z.string().optional() }).strict())
      .optional(),
    signatures: z.array(z.string()),
    weaknesses: z.array(z.string()),
    /** a required card and the alternative codes that can stand in for it */
    alternatives: z.record(z.string(), z.array(z.string())).optional(),
    deckSize: z.number(),
    deckOptions: z.array(DeckOption),
    portrait: z.string().optional(),
  })
  .strict();
export type InvestigatorDef = z.infer<typeof InvestigatorDef>;

export const DeckDef = z
  .object({
    id: z.string(),
    name: z.string(),
    investigator: z.string(),
    cards: z.record(z.string(), z.number().int().positive()),
    /** if true, a random basic weakness is added at campaign start (in addition to listed cards) */
    randomBasicWeakness: z.boolean().default(false),
  })
  .strict();
export type DeckDef = z.infer<typeof DeckDef>;

// ---------- scenarios & campaigns ----------
export const Difficulty = z.enum(["easy", "standard", "hard", "expert"]);
export type Difficulty = z.infer<typeof Difficulty>;

/** campaign-level predicates */
export type LogCondition =
  | { logHas: string }
  | { not: LogCondition }
  | { playerCount: number }
  | { playersAtLeast: number }
  | { logCount: { key: string; min?: number; max?: number } };
export const LogCondition: z.ZodType<LogCondition> = z.lazy(() =>
  z.union([
    z.object({ logHas: z.string() }).strict(),
    z.object({ not: LogCondition }).strict(),
    z.object({ playerCount: z.number() }).strict(),
    z.object({ playersAtLeast: z.number() }).strict(),
    z
      .object({
        logCount: z.object({
          key: z.string(),
          min: z.number().optional(),
          max: z.number().optional(),
        }),
      })
      .strict(),
  ]),
);

/** scenario setup steps, performed in order */
export const SetupStep = z.discriminatedUnion("do", [
  /** `n` of these codes at random (the seed's): into play, set aside, or as the act or agenda (on top of its deck,
   * current); the rest removed, set aside or left; `backs`: the chosen cards' separate backs set aside */
  z
    .object({
      do: z.literal("chooseRandom"),
      from: z.array(z.string()).min(2),
      n: z.number().int().positive().optional(),
      then: z.enum(["putIntoPlay", "setAside", "act", "agenda"]),
      deck: z.string().optional(),
      rest: z.enum(["remove", "setAside", "keep"]),
      backs: z.literal("setAside").optional(),
      when: LogCondition.optional(),
    })
    .strict(),
  /** `n` cards at random out of a pile (the set-aside cards, the encounter deck, a side deck) leave the game */
  z
    .object({
      do: z.literal("removeRandom"),
      from: z.union([z.enum(["setAside", "encounterDeck"]), z.string().regex(/^sideDeck:/)]),
      n: z.number().int().positive(),
      filter: CardFilter.optional(),
      when: LogCondition.optional(),
    })
    .strict(),
  /** the table a checkpoint recorded rebuilt: its locations with their clues and tokens, story assets, tokens, beneath */
  z.object({ do: z.literal("fromCheckpoint"), when: LogCondition.optional() }).strict(),
  /** the set-aside cards matching the filter shuffled into the encounter deck */
  z
    .object({ do: z.literal("shuffleSetAside"), filter: CardFilter, when: LogCondition.optional() })
    .strict(),
  /** each code's copies facedown beneath a card: the scenario card, the act, the agenda, or a location by code */
  z
    .object({
      do: z.literal("putBeneath"),
      codes: z.array(z.string()),
      under: z.string(),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("putIntoPlay"),
      codes: z.array(z.string()),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("putRandomIntoPlay"),
      /** the codes to pick among; or, with `filter`, the set-aside cards matching it */
      from: z.array(z.string()).default([]),
      filter: CardFilter.optional(),
      count: z.number(),
      removeRest: z.boolean().default(true),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal(ZONE.SetAside),
      codes: z.array(z.string()),
      /** how many copies of each code; every copy when absent */
      count: z.number().int().positive().optional(),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal(EVENT.Remove),
      codes: z.array(z.string()),
      when: LogCondition.optional(),
    })
    .strict(),
  z.object({ do: z.literal("startAt"), code: z.string(), when: LogCondition.optional() }).strict(),
  z
    .object({
      do: z.literal(EVENT.Spawn),
      code: z.string(),
      at: z.string(),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("shuffleIntoEncounter"),
      codes: z.array(z.string()),
      create: z.boolean().optional(),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("placeDoomOnAgenda"),
      amount: z.number(),
      when: LogCondition.optional(),
    })
    .strict(),
  z
    .object({ do: z.literal("addChaosToken"), token: ChaosToken, when: LogCondition.optional() })
    .strict(),
  z
    .object({
      do: z.literal("discardRandomFromHands"),
      amount: z.number(),
      when: LogCondition.optional(),
    })
    .strict(),
  z.object({ do: z.literal("script"), fn: z.string(), when: LogCondition.optional() }).strict(),
]);
export type SetupStep = z.infer<typeof SetupStep>;

export const TokenEffect = z
  .object({
    modifier: z.union([z.number(), z.enum(["X"])]),
    /** how X is computed; implemented in engine/rules/chaosBag */
    x: z
      .enum([
        "ghoulsAtYourLocation",
        "highestDoomOnCultist",
        "monstersInPlay",
        "totalDoomInPlay",
        "actStage",
        "elitesInVictoryOrUnderAct",
        /** the cards beneath the act, the agenda, the scenario card; the locations with none beneath them */
        "beneathAct",
        "beneathAgenda",
        "beneathScenario",
        "locationsWithoutCardBeneath",
        /** the named tokens `xTokens` names */
        "tokensOn",
        "cluesYouControl",
        "fireInPlay",
        "atRitualSite",
      ])
      .optional(),
    /** the modifier while a condition holds, for the investigator testing ("−3 instead if you have 3 or more horror") */
    instead: z
      .object({
        when: Condition,
        modifier: z.union([z.number(), z.object({ x: z.literal(true) }).strict()]),
      })
      .strict()
      .optional(),
    /** for `x: "tokensOn"`: whose tokens of which name */
    xTokens: z.object({ name: z.string(), on: TokenHolder }).strict().optional(),
    /** X becomes X × xTimes + xPlus */
    xTimes: z.number().optional(),
    xPlus: z.number().optional(),
    onReveal: z.array(Effect).optional(),
    onFail: z.array(Effect).optional(),
    /** effects only if condition holds when revealed */
    condition: Condition.optional(),
    revealAnother: z
      .union([z.boolean(), z.literal("ifAncientOneInPlay"), z.object({ if: Condition }).strict()])
      .optional(),
  })
  .strict();
export type TokenEffect = z.infer<typeof TokenEffect>;

/** whom an effect is for: every active investigator, the lead, one the players choose, or the one an input just named */
const Who = z.enum(["each", EVENT.Lead, "choice", "input"]);

export const CampaignEffect = z.discriminatedUnion("do", [
  z
    .object({
      do: z.literal("record"),
      key: z.string(),
      value: z.union([z.boolean(), z.string(), z.array(z.string())]).default(true),
      section: z.string().optional(),
      text: z.string().optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("crossOut"),
      key: z.string(),
      section: z.string().optional(),
      erase: z.boolean().optional(),
    })
    .strict(),
  z.object({ do: z.literal("crossOutIfInVictory"), key: z.string(), code: z.string() }).strict(),
  z
    .object({
      do: z.literal("recordCards"),
      key: z.string(),
      source: z.enum(["victoryUniqueCultists", "remainingUniqueCultists"]),
    })
    .strict(),
  z
    .object({
      do: z.literal("xp"),
      bonus: z.number().default(0),
      who: Who.exclude(["choice"]).default("each"),
      victory: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      do: z.literal("trauma"),
      who: Who.exclude(["choice"]),
      physical: z.number().default(0),
      mental: z.number().default(0),
    })
    .strict(),
  z.object({ do: z.literal("kill"), who: z.enum(["each", "notResigned"]) }).strict(),
  z.object({ do: z.literal("earnCard"), code: z.string(), who: Who }).strict(),
  z
    .object({
      do: z.literal("removeCard"),
      code: z.string(),
      who: Who.exclude(["choice"]).optional(),
    })
    .strict(),
  z
    .object({
      do: z.literal("addWeakness"),
      trait: z.string().default(""),
      who: Who.exclude(["choice"]).optional(),
    })
    .strict(),
  z.object({ do: z.literal("addChaosToken"), token: ChaosToken }).strict(),
  z.object({ do: z.literal(TEST_STAGE.End), result: z.enum(["win", "lose", "survived"]) }).strict(),
]);
export type CampaignEffect = z.infer<typeof CampaignEffect>;

export const Resolution = z
  .object({
    title: z.string(),
    text: z.string(),
    effects: z.array(CampaignEffect),
    when: LogCondition.optional(),
    /** a break between two parts: the table goes into the campaign log, no experience, no upgrade (Fortune and Folly) */
    checkpoint: z.boolean().optional(),
  })
  .strict();
export type Resolution = z.infer<typeof Resolution>;

/** an act or agenda deck's card: a code, or versions of it, the first whose `when` holds, else one at random */
export const DeckEntry = z.union([
  z.string(),
  z.object({ oneOf: z.array(z.string()).min(1), when: LogCondition.optional() }).strict(),
]);
export type DeckEntry = z.infer<typeof DeckEntry>;
export const Decks = z.union([z.array(DeckEntry), z.record(z.string(), z.array(DeckEntry))]);
export type Decks = z.infer<typeof Decks>;
/** the decks by name: a plain list is deck `a` */
export const decksByName = (d: Decks): Record<string, DeckEntry[]> =>
  Array.isArray(d) ? { a: d } : d;
/** every code an act or agenda deck may hold, versions included, in deck order */
export const deckCodes = (d: Decks): string[] =>
  Object.values(decksByName(d)).flatMap((es) =>
    es.flatMap((e) => (typeof e === "string" ? [e] : e.oneOf)),
  );

export const ScenarioDef = z
  .object({
    id: z.string(),
    name: z.string(),
    card: z.string(),
    intro: z.string().optional(),
    encounterSets: z.array(z.string()),
    /** encounter sets that form a separate deck (e.g. Midnight Masks Cultist deck) */
    sideDecks: z.record(z.string(), z.array(z.string())).default({}),
    /** interludes read in the middle of play (an agenda's back says when): text, and the choices with what each records */
    interludes: z
      .record(
        z.string(),
        z
          .object({
            text: z.string(),
            choices: z
              .array(
                z
                  .object({
                    id: z.string(),
                    label: z.string(),
                    record: z
                      .object({ id: z.string(), section: z.string().optional() })
                      .strict()
                      .optional(),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .optional(),
    /** encounter sets whose locations go into the encounter deck, not set aside (Lost in Time and Space) */
    encounterLocations: z.array(z.string()).optional(),
    /** pick one of these sets at random and add to encounter deck */
    randomEncounterSet: z.array(z.string()).optional(),
    /** one deck (deck `a`) or named decks (Black Stars Rise's two agendas, Threads of Fate's three acts) */
    acts: Decks,
    agendas: Decks,
    /** a Return-to box's setup card, played beside the base reference card (`card`) */
    setupCards: z.array(z.string()).default([]),
    setup: z.array(SetupStep),
    tokens: z.record(
      z.enum(["easy", "standard", "hard", "expert"]),
      z.record(z.enum(SYMBOL_TOKENS), TokenEffect),
    ),
    /** id -> resolution; "none" for no resolution reached */
    resolutions: z.record(z.string(), Resolution),
    /** the scenario's id in ArkhamCards' data, for imported translations */
    i18nId: z.string().optional(),
    /** undirected location connections by card code */
    connections: z.array(z.tuple([z.string(), z.string()])),
    /** one-way connections [from, to] by card code: only `from` → `to` is a move */
    oneWay: z.array(z.tuple([z.string(), z.string()])).default([]),
    /** location layout for rendering: code -> [col,row] grid */
    layout: z.record(z.string(), z.tuple([z.number(), z.number()])).default({}),
    script: z.boolean().optional(),
  })
  .strict();
export type ScenarioDef = z.infer<typeof ScenarioDef>;

// ---------- campaign flow (ADR-0011) ----------

/** the number an input answers with, where an effect takes a count */
const FlowAmount = z.union([z.number(), z.literal("input")]);

/** what a campaign does besides the resolution's own effects: the log's sections, the bag, decks, the order of play */
export const FlowEffect = z.discriminatedUnion("do", [
  ...CampaignEffect.options,
  z
    .object({
      do: z.literal("count"),
      id: z.string(),
      section: z.string().optional(),
      op: z.enum(["add", "set"]),
      value: FlowAmount,
    })
    .strict(),
  z
    .object({
      do: z.literal("listCards"),
      id: z.string(),
      section: z.string().optional(),
      codes: z.array(z.string()),
      remove: z.boolean().default(false),
    })
    .strict(),
  z
    .object({
      do: z.literal("investigatorCount"),
      id: z.string(),
      section: z.string().optional(),
      who: Who.exclude(["choice"]),
      op: z.enum(["add", "set"]),
      value: FlowAmount,
    })
    .strict(),
  z.object({ do: z.literal("removeChaosToken"), token: ChaosToken }).strict(),
  z
    .object({
      do: z.literal("replaceCard"),
      old: z.string(),
      new: z.string(),
      who: Who.exclude(["choice"]),
    })
    .strict(),
  z.object({ do: z.literal("nextScenario"), scenario: z.string() }).strict(),
  z.object({ do: z.literal("skipScenario"), scenario: z.string() }).strict(),
  z.object({ do: z.literal("replayScenario"), scenario: z.string() }).strict(),
  z
    .object({
      do: z.literal("setData"),
      key: z.string(),
      value: z.union([z.boolean(), z.number(), z.string()]),
    })
    .strict(),
]);
export type FlowEffect = z.infer<typeof FlowEffect>;

type WhoInv = "any" | "input" | "lead";
export type FlowCondition =
  | { kind: "logHas"; id: string; section?: string }
  | { kind: "logCrossedOut"; id: string; section?: string }
  | { kind: "logCount"; id: string; section?: string; min?: number; max?: number }
  | { kind: "logCards"; id: string; section?: string; card?: string }
  | {
      kind: "investigatorCount";
      id: string;
      section?: string;
      inv: WhoInv;
      min?: number;
      max?: number;
    }
  | { kind: "scenarioCompleted"; scenario: string; resolution?: string }
  | { kind: "difficulty"; is: z.infer<typeof Difficulty>[] }
  | { kind: "playerCount"; min?: number; max?: number }
  | { kind: "trauma"; inv: WhoInv; physical?: number; mental?: number }
  | { kind: "hasCard"; card: string; inv: WhoInv }
  | { kind: "data"; key: string; equals?: boolean | number | string; min?: number }
  /** the scenario just played: an investigator resigned, was defeated; every investigator resigned */
  | { kind: "anyResigned" }
  | { kind: "anyDefeated" }
  | { kind: "allResigned" }
  | { kind: "not"; condition: FlowCondition }
  | { kind: "all"; conditions: FlowCondition[] }
  | { kind: "any"; conditions: FlowCondition[] }
  /** a test the game can't make (partners, supplies, linked campaigns): it takes the guide's default `take` */
  | { kind: "unsupported"; name: string; take: boolean };
const WhoInv = z.enum(["any", "input", EVENT.Lead]);
export const FlowCondition: z.ZodType<FlowCondition> = z.lazy(() =>
  z.union([
    z.object({ kind: z.enum(["anyResigned", "anyDefeated", "allResigned"]) }).strict(),
    z
      .object({ kind: z.literal("logHas"), id: z.string(), section: z.string().optional() })
      .strict(),
    z
      .object({ kind: z.literal("logCrossedOut"), id: z.string(), section: z.string().optional() })
      .strict(),
    z
      .object({
        kind: z.literal("logCount"),
        id: z.string(),
        section: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("logCards"),
        id: z.string(),
        section: z.string().optional(),
        card: z.string().optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("investigatorCount"),
        id: z.string(),
        section: z.string().optional(),
        inv: WhoInv,
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("scenarioCompleted"),
        scenario: z.string(),
        resolution: z.string().optional(),
      })
      .strict(),
    z.object({ kind: z.literal("difficulty"), is: z.array(Difficulty) }).strict(),
    z
      .object({
        kind: z.literal("playerCount"),
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal("trauma"),
        inv: WhoInv,
        physical: z.number().optional(),
        mental: z.number().optional(),
      })
      .strict(),
    z.object({ kind: z.literal("hasCard"), card: z.string(), inv: WhoInv }).strict(),
    z
      .object({
        kind: z.literal("data"),
        key: z.string(),
        equals: z.union([z.boolean(), z.number(), z.string()]).optional(),
        min: z.number().optional(),
      })
      .strict(),
    z.object({ kind: z.literal("not"), condition: FlowCondition }).strict(),
    z.object({ kind: z.literal("all"), conditions: z.array(FlowCondition) }).strict(),
    z.object({ kind: z.literal("any"), conditions: z.array(FlowCondition) }).strict(),
    z.object({ kind: z.literal("unsupported"), name: z.string(), take: z.boolean() }).strict(),
  ]),
);

const StepIds = z.array(z.string()).default([]);
const FlowChoice = z
  .object({
    id: z.string(),
    text: z.string(),
    effects: z.array(FlowEffect).default([]),
    steps: StepIds,
    when: FlowCondition.optional(),
  })
  .strict();
export type FlowChoice = z.infer<typeof FlowChoice>;

/** one thing a campaign shows or asks (the prompts are `chooseOne` … `unsupported`); steps are keyed by id in `CampaignFlow.steps` and named by the steps around them */
export const CampaignStep = z.discriminatedUnion("kind", [
  /** read: a title, the text, bullets (the log entries a step records are read as bullets) */
  z
    .object({
      kind: z.literal("story"),
      title: z.string().optional(),
      text: z.string().optional(),
      bullets: z.array(z.string()).default([]),
    })
    .strict(),
  z
    .object({ kind: z.literal("branch"), condition: FlowCondition, then: StepIds, else: StepIds })
    .strict(),
  z.object({ kind: z.literal("effects"), effects: z.array(FlowEffect) }).strict(),
  z
    .object({
      kind: z.literal("chooseOne"),
      title: z.string().optional(),
      text: z.string().optional(),
      choices: z.array(FlowChoice).min(1),
    })
    .strict(),
  /** a number with limits; its effects take it as "input" */
  z
    .object({
      kind: z.literal("counter"),
      title: z.string().optional(),
      text: z.string().optional(),
      min: z.number().default(0),
      max: z.number().optional(),
      effects: z.array(FlowEffect).default([]),
      steps: StepIds,
    })
    .strict(),
  /** an investigator among the active ones; the effects and steps follow with them as "input" */
  z
    .object({
      kind: z.literal("investigatorChoice"),
      title: z.string().optional(),
      text: z.string().optional(),
      optional: z.boolean().default(false),
      effects: z.array(FlowEffect).default([]),
      steps: StepIds,
    })
    .strict(),
  /** cards among `codes` (or among the investigators' decks when empty); the effects take them as code "$input" */
  z
    .object({
      kind: z.literal("cardChoice"),
      title: z.string().optional(),
      text: z.string().optional(),
      codes: z.array(z.string()).default([]),
      min: z.number().default(1),
      max: z.number().default(1),
      effects: z.array(FlowEffect).default([]),
      steps: StepIds,
    })
    .strict(),
  z
    .object({
      kind: z.literal("checklist"),
      title: z.string().optional(),
      text: z.string().optional(),
      min: z.number().default(0),
      max: z.number().optional(),
      choices: z.array(FlowChoice).min(1),
    })
    .strict(),
  /** side scenarios on offer: accepting one pays its cost and plays it before the flow goes on */
  z
    .object({
      kind: z.literal("sideScenario"),
      title: z.string().optional(),
      text: z.string().optional(),
      scenarios: z
        .array(z.object({ scenario: z.string(), cost: z.number().default(0) }).strict())
        .min(1),
    })
    .strict(),
  /** a prompt the game can't offer (linked campaigns, partners, supplies, text entry…): the guide's text, then its default */
  z
    .object({
      kind: z.literal("unsupported"),
      name: z.string(),
      title: z.string().optional(),
      text: z.string().optional(),
      effects: z.array(FlowEffect).default([]),
      steps: StepIds,
    })
    .strict(),
  z.object({ kind: z.literal("upgradeDecks") }).strict(),
  z
    .object({
      kind: z.literal(TEST_STAGE.End),
      result: z.enum(["win", "lose", "survived"]).optional(),
    })
    .strict(),
]);
export type CampaignStep = z.infer<typeof CampaignStep>;

/** the step ids a step leads to */
export function stepRefs(st: CampaignStep): string[] {
  switch (st.kind) {
    case "branch":
      return [...st.then, ...st.else];
    case "chooseOne":
    case "checklist":
      return st.choices.flatMap((c) => c.steps);
    case "counter":
    case "investigatorChoice":
    case "cardChoice":
    case "unsupported":
      return st.steps;
    default:
      return [];
  }
}

/**
 * content/campaigns/<id>/flow.json: what happens before the first scenario (`setup`), in the order of play (`order`:
 * scenario ids and the interludes named in `interludes`), after each scenario (`resolutions`, by scenario then
 * resolution id) and the steps themselves. A resolution with no entry here runs the scenario file's own `effects`.
 */
export const CampaignFlow = z
  .object({
    setup: StepIds,
    order: z.array(z.string()),
    interludes: z
      .record(
        z.string(),
        z
          .object({
            kind: z.enum(["interlude", "epilogue"]),
            name: z.string().optional(),
            steps: StepIds,
          })
          .strict(),
      )
      .default({}),
    resolutions: z.record(z.string(), z.record(z.string(), StepIds)).default({}),
    /** a scenario's own setup steps (difficulty tokens, an intro choice), run when the order reaches it, before it sets up */
    before: z.record(z.string(), StepIds).default({}),
    steps: z.record(z.string(), CampaignStep),
  })
  .strict()
  .superRefine((f, ctx) => {
    const need = (path: (string | number)[], id: string) => {
      if (!f.steps[id])
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `unknown step ${id}` });
    };
    f.setup.forEach((id, n) => need(["setup", n], id));
    for (const [k, i] of Object.entries(f.interludes))
      i.steps.forEach((id, n) => need(["interludes", k, "steps", n], id));
    for (const [sc, byRes] of Object.entries(f.resolutions))
      for (const [r, ids] of Object.entries(byRes))
        ids.forEach((id, n) => need(["resolutions", sc, r, n], id));
    for (const [sc, ids] of Object.entries(f.before))
      ids.forEach((id, n) => need(["before", sc, n], id));
    for (const [k, st] of Object.entries(f.steps))
      stepRefs(st).forEach((id, n) => need(["steps", k, n], id));
  });
export type CampaignFlow = z.infer<typeof CampaignFlow>;

/** how a section of the campaign log is kept and shown */
export const LOG_SECTION_KINDS = ["entries", "count", "cards", "investigatorCount"] as const;
export const LogSection = z
  .object({ id: z.string(), kind: z.enum(LOG_SECTION_KINDS), label: z.string() })
  .strict();
export type LogSection = z.infer<typeof LogSection>;

export const CampaignDef = z
  .object({
    id: z.string(),
    name: z.string(),
    scenarios: z.array(z.string()),
    /** the campaign's id in ArkhamCards' data, for imported translations */
    i18nId: z.string().optional(),
    chaosBags: z.record(Difficulty, z.array(ChaosToken)),
    /** human-readable labels for log keys */
    logLabels: z.record(z.string(), z.string()).default({}),
    /** choices made when the campaign is created, fixed after (a Return-to box's encounter sets in its base campaign) */
    options: z
      .array(
        z
          .object({
            id: z.string(),
            labelKey: z.string(),
            /** new set -> the set it replaces */
            replaceSets: z.record(z.string(), z.string()).default({}),
            /** sets gathered beside the others */
            addSets: z.array(z.string()).default([]),
          })
          .strict(),
      )
      .default([]),
    /** the card packs its scenarios use; loaded before the campaign starts or restores */
    packs: z.array(z.string()).default(["core"]),
    /** generated from the campaign guides (ADR-0007): cards without written behaviour have no effect */
    generated: z.boolean().default(false),
    /** the first scenario's reference card (the scenarios' chapters in the picker's sidebar start from it) */
    card: z.string().optional(),
    /** the first chapter's art, the campaign's tile in the picker: its first scenario's first agenda */
    cover: z.string().optional(),
    /** the campaign guide's opening text (an epigraph, or a story) and its scenarios' names, for the new-game tile */
    prologue: z.string().optional(),
    scenarioNames: z.array(z.string()).optional(),
    /** the campaign log's sections, as the guide prints them (the notes section is always there) */
    logSections: z.array(LogSection).default([]),
    /** every scenario's reference card, in order, with the interludes marked: the picker's sidebar before the scenarios load */
    cards: z
      .array(
        z
          .object({
            scenario: z.string(),
            name: z.string().optional(),
            /** the scenario's reference card */
            code: z.string().optional(),
            /** its first agenda and first act: the chapter's art, as the act and agenda viewer shows them */
            agenda: z.string().optional(),
            act: z.string().optional(),
            interlude: z.boolean().optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
export type CampaignDef = z.infer<typeof CampaignDef>;

// ---------- sounds ----------

/** CC0 from a public source, made by the project's author, or supplied by the author with no recorded origin */
export const SoundLicense = z.enum(["CC0", "own", "provided"]);
/** a CC0 clip names where it came from */
const sourced = (c: { license: string; source?: string }) => c.license !== "CC0" || !!c.source;
const NEEDS_SOURCE = { message: "a CC0 clip needs its source URL", path: ["source"] };

/** one audio file with its provenance */
const SoundClipShape = z
  .object({
    /** file name under public/sounds (effects: .mp3; music: the stem, served as .m4a and .webm) */
    file: z.string().min(1),
    /** a mix offset on top of the import's fixed loudness (ADR-0009) */
    gain: z.number().min(0.5).max(1.5).default(1),
    source: z.string().url().optional(),
    author: z.string().min(1),
    license: SoundLicense,
    /** the original's path under sounds-src/, for the import script */
    original: z.string().optional(),
    /** seconds to keep of the original [start, end] */
    trim: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
  })
  .strict();
const SoundClip = SoundClipShape.refine(sourced, NEEDS_SOURCE);
const SoundTrack = SoundClipShape.extend({
  loop: z.boolean().default(true),
  loopStart: z.number().min(0).optional(),
  loopEnd: z.number().min(0).optional(),
  /** kept with its files and candidates, but never played: the moment keeps the music that was on */
  silent: z.boolean().default(false),
})
  .strict()
  .refine(sourced, NEEDS_SOURCE);
/** a moment's value that silences it while keeping its slot */
export const NO_SOUND = "none";
/** when a card's own sound replaces the generic one */
export const CARD_SOUND_WHEN = ["play", "fight", "spawn"] as const;
export const CardSoundWhen = z.enum(CARD_SOUND_WHEN);
export type CardSoundWhen = z.infer<typeof CardSoundWhen>;

/**
 * content/sounds/sounds.json: the clips and tracks, and what each serves. `events` keys are engine event types, with
 * an optional ":variant" (damage:horror); `moments` keys are UI moments; `traits` and `cards` pick a card's own clip
 * by trait or by code. Every reference must name a clip in `effects`.
 */
export const SoundManifest = z
  .object({
    effects: z.record(z.string(), SoundClip),
    /** "bed:<scenarioId>", "card:<act or agenda code>", "fight", "tension", "tension:<scenarioId>", "menu"; "<id>:alt" is another take */
    music: z.record(z.string(), SoundTrack),
    events: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    moments: z.record(z.string(), z.string()),
    traits: z.record(CardSoundWhen, z.record(z.string(), z.string())).default({}),
    cards: z.record(z.string(), z.record(CardSoundWhen, z.string())).default({}),
  })
  .strict()
  .superRefine((m, ctx) => {
    const need = (path: (string | number)[], id: string) => {
      if (!m.effects[id])
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `unknown clip ${id}` });
    };
    for (const [k, v] of Object.entries(m.events))
      (Array.isArray(v) ? v : [v]).forEach((id, n) =>
        need(["events", k, ...(Array.isArray(v) ? [n] : [])], id),
      );
    for (const [k, id] of Object.entries(m.moments)) if (id !== NO_SOUND) need(["moments", k], id);
    for (const [when, byTrait] of Object.entries(m.traits))
      for (const [trait, id] of Object.entries(byTrait)) need(["traits", when, trait], id);
    for (const [code, byWhen] of Object.entries(m.cards))
      for (const [when, id] of Object.entries(byWhen)) need(["cards", code, when], id);
  });
export type SoundManifest = z.infer<typeof SoundManifest>;
/**
 * content/sounds/candidates.json: ten to fifteen CC0 candidates for every sound slot, drawn by `import:sounds -- --candidates`.
 * The audio itself stays in the untracked sounds-src/candidates; this file is the provenance and what the picker lists.
 */
export const SoundCandidate = z
  .object({
    /** the original's path under sounds-src */
    original: z.string().min(1),
    /** the normalised preview's path under sounds-src/candidates */
    preview: z.string().min(1),
    source: z.string().url(),
    author: z.string().min(1),
    license: z.literal("CC0"),
    /** the file's name and pack, for the picker */
    description: z.string().min(1),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    /** a track's loop seam in dB (start against end) */
    seam: z.number().optional(),
  })
  .strict();
export type SoundCandidate = z.infer<typeof SoundCandidate>;
/** how many candidates a slot is drawn with, and the range the file accepts */
export const CANDIDATES_PER_SLOT = 12;
export const CANDIDATES_RANGE = [10, 15] as const;
export const SoundCandidates = z
  .object({
    slots: z.record(
      z.string(),
      z
        .object({
          kind: z.enum(["effect", "music"]),
          where: z.string().min(1),
          candidates: z.array(SoundCandidate).min(CANDIDATES_RANGE[0]).max(CANDIDATES_RANGE[1]),
        })
        .strict(),
    ),
  })
  .strict();
export type SoundCandidates = z.infer<typeof SoundCandidates>;

export const EMPTY_SOUNDS: SoundManifest = {
  effects: {},
  music: {},
  events: {},
  moments: {},
  traits: {},
  cards: {},
};

export const I18nCards = z.record(
  z.string(),
  z
    .object({
      name: z.string().optional(),
      text: z.string().optional(),
      backText: z.string().optional(),
      subname: z.string().optional(),
      backName: z.string().optional(),
      traits: z.array(z.string()).optional(),
    })
    .strict(),
);
export const I18nUi = z.record(z.string(), z.string());
/** campaign / scenario / encounter-set text for a locale */
export const I18nCampaigns = z
  .object({
    campaigns: z
      .record(
        z.string(),
        z
          .object({
            name: z.string().optional(),
            prologue: z.string().optional(),
            scenarioNames: z.array(z.string()).optional(),
            logLabels: z.record(z.string(), z.string()).default({}),
            /** a campaign flow's words by step id: the title and text of a story or prompt, the text of each choice by its id */
            steps: z
              .record(
                z.string(),
                z
                  .object({
                    title: z.string().optional(),
                    text: z.string().optional(),
                    choices: z.record(z.string(), z.string()).optional(),
                  })
                  .strict(),
              )
              .default({}),
            /** the interludes' and epilogues' names by id */
            interludeNames: z.record(z.string(), z.string()).default({}),
          })
          .strict(),
      )
      .default({}),
    scenarios: z
      .record(
        z.string(),
        z
          .object({
            name: z.string().optional(),
            intro: z.string().optional(),
            resolutions: z
              .record(
                z.string(),
                z.object({ title: z.string().optional(), text: z.string().optional() }).strict(),
              )
              .default({}),
          })
          .strict(),
      )
      .default({}),
    encounterSets: z.record(z.string(), z.string()).default({}),
  })
  .strict();
export type I18nCampaigns = z.infer<typeof I18nCampaigns>;

// ---------- coverage (ADR-0012) ----------
/** how many of some cards work in the game, and the ones that don't counted by card type */
export const CardCount = z
  .object({
    total: z.number().int(),
    works: z.number().int(),
    rest: z.record(z.string(), z.number().int()),
  })
  .strict();
export type CardCount = z.infer<typeof CardCount>;
/** content/coverage.json (npm run coverage): per pack, per campaign and per investigator, read by the new-game screen before any pack loads */
export const ContentCoverage = z
  .object({
    packs: z.record(z.string(), z.object({ encounter: CardCount, player: CardCount }).strict()),
    campaigns: z.record(
      z.string(),
      z
        .object({ cards: CardCount, unscripted: z.array(z.string()), complete: z.boolean() })
        .strict(),
    ),
    /** per scenario: the cards it uses (its reference card too), whether its token effects are real, whether it has a script (ADR-0013) */
    scenarios: z.record(
      z.string(),
      z
        .object({
          campaign: z.string(),
          cards: CardCount,
          tokens: z.boolean(),
          scripted: z.boolean(),
          complete: z.boolean(),
        })
        .strict(),
    ),
    /** whether the investigator's card and their signature cards work */
    investigators: z.record(z.string(), z.boolean()),
  })
  .strict();
export type ContentCoverage = z.infer<typeof ContentCoverage>;

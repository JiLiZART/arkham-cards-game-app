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

/** a location named in an effect: this card, your location, or the first location in play of a code */
export const LocationRef = z.string();
/**
 * Where a location goes on the map: a cell `[col, row]`; a direction from a location; the next free cell; or a cell the
 * investigator chooses among several
 */
export type Placement =
  | [number, number]
  | { direction: "left" | "right" | "above" | "below"; of: string }
  | "free"
  | { choose: [number, number][] };
export const Placement: z.ZodType<Placement> = z.union([
  z.tuple([z.number(), z.number()]),
  z.object({ direction: z.enum(["left", "right", "above", "below"]), of: LocationRef }).strict(),
  z.literal("free"),
  z.object({ choose: z.array(z.tuple([z.number(), z.number()])).min(1) }).strict(),
]);

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
  /** n per clue on the context's enemy (Esoteric Formula: +2 per clue on the attacked enemy) */
  z.object({ cluesOnEnemy: z.number() }).strict(),
  /** the named tokens a card or you hold */
  z.object({ tokensOn: z.object({ name: z.string(), on: TokenHolder }).strict() }),
  /** the damage, horror, clues or resources on you, plus a number (Eager for Death's difficulty, Humanities Building's X) */
  z
    .object({
      onYou: z.enum([EVENT.Damage, "horror", EVENT.Clues, "resources"]),
      plus: z.number().optional(),
    })
    .strict(),
  /** n per action you have left in your turn (none outside it): Eerie Glade, Lost Memories */
  z.object({ actionsLeft: z.number() }).strict(),
  /** the event enemy's damage or horror value (Hypnotic Gaze: "the attacking enemy's damage") */
  z.object({ eventEnemyStat: z.enum([EVENT.Damage, "horror"]) }).strict(),
  /** `base`, `plus` more while a condition holds for you ("+2 difficulty if Hunting Horror is at your location") */
  z
    .object({
      base: z.number(),
      plus: z.number(),
      if: z.lazy((): z.ZodType<Condition> => Condition),
    })
    .strict(),
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
  /** you choose an investigator at your location or a connecting one (Jim's Trumpet) */
  "chooseAtOrConnecting",
  /** you choose any investigator in the game (Flare: "any investigator's deck") */
  "chooseAny",
  "eachAtLocation",
  /** each investigator at the location the source is attached to, or is (Sordid and Silent) */
  "eachAtAttachedLocation",
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
  /** resources collected in the upkeep phase beyond the 1 (Jenny Barnes) */
  "upkeepResources",
  /** resources the investigator starts the game with beyond the 5 (Indebted: -2) */
  "startingResources",
  /** the difficulty of the investigator's skill tests (Fine Clothes: -2 during parley actions) */
  "difficulty",
]);
export type ModStat = z.infer<typeof ModStat>;

export const ModFlag = z.enum([
  "cannotPlayAssetsOrEvents",
  "cannotBeInvestigated",
  "cannotDiscoverClues",
  "cannotSpendClues",
  "cannotMoveInto",
  "nonEliteCannotMoveInto",
  /** non-Elite enemies cannot spawn here: they spawn at a connecting location instead, if able (Barricade (3)) */
  "cannotSpawnAt",
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
  /** on an enemy: player card effects can't target or affect it; attacks on it are still made (Realms Beyond's
   * Yog-Sothoth) */
  "immuneToPlayerCards",
  /** on an enemy: it gains the Elite trait (Imperceptible Creature) */
  "elite",
  /** on an enemy: it loses Aloof, its own or granted (Raise the Stakes) */
  "notAloof",
  /** investigators can't move out of this location */
  "cannotLeave",
  /** on an enemy: the investigator engaged with it can't gain resources (O'Bannion's Thug) */
  "cannotGainResourcesWhileEngaged",
  /** the damage and horror dealt to this investigator are direct (Light of Aforgomon) */
  "directDamage",
  /** the investigator draws no card in the upkeep phase (VIP Area) */
  "noUpkeepDraw",
  /** the investigator gains no resource in the upkeep phase (VIP Area) */
  "noUpkeepResources",
  /** the investigator can't gain resources (Museum Entrance) */
  "cannotGainResources",
  /** the investigator can't investigate (Administration Office, while they have too little) */
  "cannotInvestigate",
  /** the investigator can't take a fight, evade, move or play action (A Baleful Welcome); `cannotInvestigate` is the fourth */
  "cannotFight",
  "cannotEvade",
  "cannotMoveAction",
  "cannotPlayAction",
  /** the investigator can't take a draw or a resource action (Village Commons, Silent Decay) */
  "cannotDrawAction",
  "cannotResourceAction",
  /** on an enemy: the investigator engaged with it can't move (Grappling Horror) */
  "cannotMoveWhileEngaged",
  /** the investigator can't move (Claws of Steam: "you cannot move from this location this round"); on an enemy, it
   * enters no location (Yog-Sothoth "cannot leave Realms Beyond") */
  "cannotMove",
  /** the investigator can't play events (House in the Reeds) */
  "cannotPlayEvents",
  /** on a location: clues are discovered here only by investigating it (Schoolhouse) */
  "cluesOnlyByInvestigating",
  /** on a location: no clues can be placed on it (Ascending the Hill: non-[[Altered]] locations) */
  "cannotPlaceClues",
  /** the assets the investigator controls cannot ready (Wracked by Nightmares) */
  "assetsCannotReady",
  /** the modifier of the skull tokens the investigator reveals is 0; their effects still resolve (Jim Culver) */
  "skullIsZero",
  /** on a location: each enemy that moves in the enemy phase moves toward it instead (Lure) */
  "luresEnemies",
  /** the investigator may choose not to gain resources in the upkeep phase (Dark Horse) */
  "mayDeclineUpkeepResources",
]);
export type ModFlag = z.infer<typeof ModFlag>;

/** when (during what kind of test) a modifier applies */
/** `parleying`: a test during a parley action (Fine Clothes) */
export const ModWhen = z.enum([
  "always",
  "investigating",
  "fighting",
  "evading",
  "skillTest",
  "parleying",
]);

/** who/what a constant modifier applies to */
export const ModScope = z.enum([
  "controller", // investigator controlling source (or bearer of threat-area card)
  "investigatorsAtLocation", // each investigator at controller's location
  "attachedLocation",
  "self", // the card itself (enemy/location)
  "allEnemies",
  "tester", // the investigator performing the current test (temporary modifiers)
  "enemiesAtLocation", // each enemy at the source location (or at the controller's)
]);

/** an enemy's prey instruction */
export const Prey = z.union([
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
    /** an enemy target gains this prey instruction when it has none of its own (Hired Gun: "Prey - Most resources") */
    prey: Prey.optional(),
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
    /** actions spent from your turn (Kukri: "spend 1 additional action") */
    actions: z.number().optional(),
    /** doom placed on this card (Blood Pact: "Add 1 doom to Blood Pact") */
    doomOnSelf: z.number().optional(),
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
  | { failedBy: { min?: number; max?: number } }
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
  /** this card has horror on it (Peter Sylvestre) */
  | { selfHasHorror: true }
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
  /** the cards in your discard pile */
  | { discardPile: { min?: number; max?: number } }
  /** the skill being tested */
  | { testSkill: Skill }
  /** the investigators in the game */
  | { players: { min?: number; max?: number } }
  /** your location matches the filter (The Hidden Chamber) */
  | { yourLocationIs: CardFilter }
  /** the current agenda's stage (Where Doom Awaits: "if it is Agenda 2") */
  | { agendaStage: { min?: number; max?: number } }
  /** the actions you have left in your turn (none outside it) */
  | { actionsLeft: { min?: number; max?: number } }
  /** the skill test under way was started by this very card (Fire Axe: "an attack using Fire Axe") */
  | { testSourceIsSelf: true }
  /** the enemy of the skill test under way is engaged with you (Oops!: "attacking an enemy engaged with you") */
  | { testEnemyEngagedWithYou: true }
  /** the enemy of the skill test under way is engaged with another investigator (Blackjack 2) */
  | { testEnemyEngagedWithOther: true }
  /** a skill card you own is committed to the skill test under way (Try and Try Again) */
  | { committedSkillYouOwn: true }
  /** a scenario card with a resign ability is in play ("I'm outta here!") */
  | { resignInPlay: true }
  /** no other investigator is at your location (Stand Together needs one: `not`) */
  | { aloneAtYourLocation: true }
  /** the cards in your hand (Higher Education: "5 or more cards in your hand") */
  | { cardsInHand: { min?: number; max?: number } }
  /** an enemy at your location is not engaged with you (Springfield M1903) */
  | { enemyNotEngagedWithYou: true }
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
    z
      .object({ failedBy: z.object({ min: z.number().optional(), max: z.number().optional() }) })
      .strict(),
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
    z.object({ selfHasHorror: z.literal(true) }).strict(),
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
    z
      .object({
        discardPile: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z.object({ testSkill: Skill }).strict(),
    z
      .object({
        players: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z.object({ yourLocationIs: CardFilter }).strict(),
    z
      .object({
        agendaStage: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z
      .object({
        actionsLeft: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z.object({ testSourceIsSelf: z.literal(true) }).strict(),
    z.object({ testEnemyEngagedWithYou: z.literal(true) }).strict(),
    z.object({ testEnemyEngagedWithOther: z.literal(true) }).strict(),
    z.object({ committedSkillYouOwn: z.literal(true) }).strict(),
    z.object({ resignInPlay: z.literal(true) }).strict(),
    z.object({ aloneAtYourLocation: z.literal(true) }).strict(),
    z
      .object({
        cardsInHand: z.object({ min: z.number().optional(), max: z.number().optional() }).strict(),
      })
      .strict(),
    z.object({ enemyNotEngagedWithYou: z.literal(true) }).strict(),
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
      /** `anyLocation`: one the investigator chooses among those with clues (Servant of Many Mouths) */
      at?: "yourLocation" | "testLocation" | "yourOrConnecting" | "anyLocation" | "connecting";
    }
  /** `assetsFirst`: the damage goes to the investigator's assets while any can take it (Claws of Steam) */
  | {
      op: "takeDamage";
      amount: Amount;
      direct?: boolean;
      assetsFirst?: boolean;
      target?: InvTarget;
    }
  | { op: "takeHorror"; amount: Amount; direct?: boolean; target?: InvTarget }
  | {
      op: "heal";
      /** an amount: the horror value of the enemy you defeated ("If it bleeds...") */
      damage?: Amount;
      horror?: Amount;
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
  /** doom off this card (Destroyed Path), or off a card you control that you choose (Moonlight Ritual) */
  | { op: "removeDoom"; amount: Amount; on: "self" | "chooseYours" }
  | {
      op: "placeTokens";
      /** this card, you, or your location; `you` takes named tokens only; clues from the bank go on `yourLocation` too */
      on: TokenHolder;
      clues?: Amount;
      horror?: number;
      damage?: Amount;
      doom?: number;
      resources?: number;
      /** named tokens (wards, scrap, seals): `amount` of them by this name */
      name?: string;
      amount?: Amount;
    }
  | { op: "putInThreatArea" }
  /** `mostInvestigators`: a location with the most investigators (Secret Door); the lead breaks a tie */
  | {
      op: "attachToLocation";
      where: "yours" | "mostClues" | "mostInvestigators";
      limitOnePerLocation?: boolean;
    }
  | { op: "discardSelf" }
  | { op: "addSelfToVictory" }
  | { op: "removeSelf" }
  | {
      op: "skillTest";
      skill: Skill | Skill[];
      difficulty: Amount;
      onSuccess?: Effect[];
      onFail?: Effect[];
      perPointFailed?: Effect[];
    }
  | {
      op: "fight";
      target?: EnemyTarget;
      auto?: boolean;
      skill?: Skill;
      bonus?: Amount;
      /** only enemies matching it may be attacked (Esoteric Formula: an [[Abomination]] enemy) */
      filter?: CardFilter;
      /** more damage for this attack: a number or an amount ("I've got a plan!": +1 per clue you have, at most 3) */
      damageBonus?: Amount;
      onSuccess?: Effect[];
      onFail?: Effect[];
      onTokens?: OnTokens;
      /** checked as the damage is dealt (Song of the Dead: "if a [skull] symbol is revealed during this attack") */
      extraDamageIf?: Condition;
      /** how much more damage `extraDamageIf` adds (1 if absent; Alchemical Concoction's +6) */
      extraDamage?: number;
      extraDamageIfSucceedBy?: number;
      /** damage by the margin: +1 per point succeeded by up to `max` (or, `instead`, 1 per point, at least 1, at most `max`, in place of the standard 1); a failure that damages another investigator deals 1 per point failed by, at most `max` */
      damagePerMargin?: { max: number; instead?: boolean; failMax?: number };
      /** after a success, before the damage: pay `cost` for more (Sledgehammer, Cosmic Flame) */
      boost?: Boost;
      /** when the attack defeats its enemy (Decisive Strike) */
      onDefeat?: Effect[];
      /** the skill's base value for this test, in place of the investigator's (Duke: "a base [combat] skill of 4") */
      baseSkill?: number;
      /** a failure against an enemy engaged with another investigator deals them no damage (Blackjack) */
      noDamageToOthersOnFail?: boolean;
      /** only an enemy not engaged with you may be attacked (Springfield M1903) */
      notEngagedWithYou?: boolean;
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
      /** the skill's base value for this test, in place of the investigator's (Duke) */
      baseSkill?: number;
      /** you may first move to a connecting location, then investigate there (Duke) */
      moveFirst?: "connecting";
      /** clues a success discovers beyond the 1 (Rite of Seeking: "1 additional clue") */
      extraClues?: number;
    }
  | {
      op: "evade";
      skill?: Skill;
      bonus?: Amount;
      onSuccess?: Effect[];
      onFail?: Effect[];
      auto?: boolean;
      /** every enemy at your location evaded automatically; `engaged`: every enemy engaged with you (Fire Extinguisher) */
      all?: boolean | "engaged";
      nonElite?: boolean;
      /** only enemies matching it may be evaded (Peter Clover: a [[Criminal]] enemy) */
      filter?: CardFilter;
      onTokens?: OnTokens;
      /** the skill's base value for this test, in place of the investigator's */
      baseSkill?: number;
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
  /** the top cards of an investigator's deck discarded ("failBy": one per point the test failed by) */
  | { op: "discardDeckTop"; amount: Amount; target?: InvTarget }
  /** the card of the triggering event discarded (the Melee card used against Conglomeration of Spheres) */
  | { op: "discardEventCard" }
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
      /** who moves (you by default); you choose where (Shortcut: an investigator at your location) */
      target?: InvTarget;
    }
  /** `draw`: the card found is drawn (a weakness resolves), not just added to the hand */
  | {
      op: "searchDeck";
      /** only the top cards: a number, or an amount ("failBy": as many as the test was failed by) */
      top?: Amount;
      filter: CardFilter;
      amount?: number;
      target?: InvTarget;
      draw?: boolean;
      /** the weaknesses among the searched cards are drawn too (Mysterious Grimoire) */
      drawWeaknesses?: boolean;
      /** if no card was taken, draw 1 card (Ye Olde Magick Shoppe) */
      orDraw?: boolean;
      /** the card found is put into play under your control (Flare); you search whoever's deck it is */
      intoPlay?: boolean;
    }
  /** `anyDeck`: any investigator's deck or the encounter deck (Scrying); the cards go back on top in the order chosen */
  | { op: "lookAtTop"; amount: number; anyDeck?: boolean }
  /**
   * uses placed on an asset controlled by an investigator at your location; `double`: as many as it has (Contraband);
   * `usesType`: only an asset whose uses are of these kinds
   */
  | { op: "addUses"; amount?: number; double?: boolean; usesType?: string[]; filter: CardFilter }
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
  | {
      op: "searchEncounterDraw";
      filter: CardFilter;
      zones?: ("deck" | "discard" | "void")[];
      /** the location (code or name) the enemy found spawns at, not the drawer's (Congregational Church) */
      at?: string;
    }
  /**
   * in an attackDealsDamage or damageDealt window: cancel points of what was just dealt; `both`: up to `amount` points
   * among the damage and the horror together; `gain`: that many resources gained ("I've had worse…")
   */
  | {
      op: "preventDamage";
      amount: number;
      kind: "damage" | "horror" | "either" | "both";
      gain?: boolean;
    }
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
  | /** the links between two locations removed */ { op: "unlink"; a: string; b: string }
  | /** a link between two locations (this card, your location, or a code in play); one-way from `a` to `b` */ {
      op: "link";
      a: string;
      b: string;
      oneWay?: boolean;
    }
  | /** a set-aside location of this code put into play at a place on the map; `else` when the place is taken */ {
      op: "placeLocation";
      code: string;
      at: Placement;
      else?: Effect[];
    }
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
  /** actions lost: now during the investigator's turn, else from their next turn (Grimoire, Actions) */
  | { op: "loseActions"; amount: Amount; target?: InvTarget }
  /** the investigator's turn ends now, if it is their turn */
  | { op: "endTurn" }
  /** clues from the token bank to the investigator (not discovered): "gain 2 clues" */
  | { op: "gainClues"; amount: Amount; target?: InvTarget }
  /**
   * an enemy attacks the investigator (`target`, else you), readying and engaging first if the card says: the source
   * (`self`), the event's enemy, each at your location, or the enemy in play of the `named` code
   */
  | {
      op: "enemyAttack";
      enemy?: EnemyTarget;
      named?: string;
      ready?: boolean;
      engage?: boolean;
      target?: InvTarget;
    }
  /** a random chaos token revealed outside a skill test (it goes back); the first `on` entry it matches resolves */
  | {
      op: "revealToken";
      on: { tokens?: ChaosToken[]; parity?: "even" | "odd"; effects: Effect[] }[];
    }
  /** damage dealt to each of your assets (matching the filter) that has health ("each of your [[Ally]] assets") */
  | { op: "damageAssets"; amount: Amount; filter?: CardFilter }
  /** tokens into the chaos bag; `forCampaign`: they stay in the campaign's bag after the scenario too */
  | { op: "addChaosTokens"; tokens: ChaosToken[]; forCampaign?: boolean }
  /** effects resolved for an investigator chosen (or named) by `target`: they are "you" in them (Liquid Courage) */
  | { op: "forInvestigator"; target: InvTarget; effects: Effect[] }
  /** the event's enemy moved to a location connecting to its own, you choose which (Bait and Switch) */
  | { op: "moveEnemy"; to: "connecting" }
  /** every card you control matching the filter exhausted (Wracked by Nightmares: all your assets) */
  | { op: "exhaustCards"; filter: CardFilter }
  /** the skill test under way succeeds or fails whatever its total (Rex Murphy's elder sign) */
  | { op: "forceResult"; result: "succeed" | "fail" }
  /** the failed attack under way deals its damage to another enemy at your location, you choose which (Oops!) */
  | { op: "redirectDamage" }
  /** the context's enemy defeated; `nonElite`: only a non-[[Elite]] one (Monster Slayer 5) */
  | { op: "defeatEnemy"; nonElite?: boolean }
  /** a skill card you own committed to the test under way back to your hand, you choose which (Try and Try Again) */
  | { op: "returnCommittedSkill" }
  | { op: "script"; fn: string; args?: unknown };

/** extra effects if any of the listed tokens was revealed during the test; `after`: once the test has ended (Rite of Seeking) */
export type OnTokens = { tokens: ChaosToken[]; effects: Effect[]; after?: boolean };
export type Boost = { cost: Cost; damage?: number; clues?: number; effects?: Effect[] };
const effectsArr = (): z.ZodType<Effect[]> => z.array(Effect);
const OnTokens = (): z.ZodType<OnTokens> =>
  z
    .object({ tokens: z.array(ChaosToken), effects: effectsArr(), after: z.boolean().optional() })
    .strict();
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
        at: z
          .enum(["yourLocation", "testLocation", "yourOrConnecting", "anyLocation", "connecting"])
          .optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("takeDamage"),
        amount: Amount,
        direct: z.boolean().optional(),
        assetsFirst: z.boolean().optional(),
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
        damage: Amount.optional(),
        horror: Amount.optional(),
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
      .object({ op: z.literal("removeDoom"), amount: Amount, on: z.enum(["self", "chooseYours"]) })
      .strict(),
    z
      .object({
        op: z.literal("placeTokens"),
        on: TokenHolder,
        clues: Amount.optional(),
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
        where: z.enum(["yours", "mostClues", "mostInvestigators"]),
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
        difficulty: Amount,
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
        bonus: Amount.optional(),
        filter: CardFilter.optional(),
        damageBonus: Amount.optional(),
        onSuccess: effectsArr().optional(),
        onFail: effectsArr().optional(),
        onTokens: OnTokens().optional(),
        extraDamageIf: Condition.optional(),
        extraDamage: z.number().optional(),
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
        baseSkill: z.number().optional(),
        noDamageToOthersOnFail: z.boolean().optional(),
        notEngagedWithYou: z.boolean().optional(),
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
        baseSkill: z.number().optional(),
        moveFirst: z.literal("connecting").optional(),
        extraClues: z.number().optional(),
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
        all: z.union([z.boolean(), z.literal("engaged")]).optional(),
        nonElite: z.boolean().optional(),
        filter: CardFilter.optional(),
        onTokens: OnTokens().optional(),
        baseSkill: z.number().optional(),
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
    z
      .object({ op: z.literal("discardDeckTop"), amount: Amount, target: InvTarget.optional() })
      .strict(),
    z.object({ op: z.literal("discardEventCard") }).strict(),
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
        target: InvTarget.optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("searchDeck"),
        top: Amount.optional(),
        filter: CardFilter,
        amount: z.number().optional(),
        target: InvTarget.optional(),
        draw: z.boolean().optional(),
        drawWeaknesses: z.boolean().optional(),
        orDraw: z.boolean().optional(),
        intoPlay: z.boolean().optional(),
      })
      .strict(),
    z
      .object({ op: z.literal("lookAtTop"), amount: z.number(), anyDeck: z.boolean().optional() })
      .strict(),
    z
      .object({
        op: z.literal("addUses"),
        amount: z.number().optional(),
        double: z.boolean().optional(),
        usesType: z.array(z.string()).optional(),
        filter: CardFilter,
      })
      .strict(),
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
        at: z.string().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("preventDamage"),
        amount: z.number(),
        kind: z.enum([EVENT.Damage, "horror", "either", "both"]),
        gain: z.boolean().optional(),
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
    z.object({ op: z.literal("unlink"), a: LocationRef, b: LocationRef }).strict(),
    z
      .object({
        op: z.literal("link"),
        a: LocationRef,
        b: LocationRef,
        oneWay: z.boolean().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("placeLocation"),
        code: z.string(),
        at: Placement,
        else: effectsArr().optional(),
      })
      .strict(),
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
    z
      .object({ op: z.literal("loseActions"), amount: Amount, target: InvTarget.optional() })
      .strict(),
    z.object({ op: z.literal("endTurn") }).strict(),
    z.object({ op: z.literal("gainClues"), amount: Amount, target: InvTarget.optional() }).strict(),
    z
      .object({
        op: z.literal("enemyAttack"),
        enemy: EnemyTarget.optional(),
        named: z.string().optional(),
        ready: z.boolean().optional(),
        engage: z.boolean().optional(),
        target: InvTarget.optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("revealToken"),
        on: z.array(
          z
            .object({
              tokens: z.array(ChaosToken).optional(),
              parity: z.enum(["even", "odd"]).optional(),
              effects: effectsArr(),
            })
            .strict(),
        ),
      })
      .strict(),
    z
      .object({ op: z.literal("damageAssets"), amount: Amount, filter: CardFilter.optional() })
      .strict(),
    z
      .object({
        op: z.literal("addChaosTokens"),
        tokens: z.array(ChaosToken).min(1),
        forCampaign: z.boolean().optional(),
      })
      .strict(),
    z
      .object({ op: z.literal("forInvestigator"), target: InvTarget, effects: effectsArr() })
      .strict(),
    z.object({ op: z.literal("moveEnemy"), to: z.literal("connecting") }).strict(),
    z.object({ op: z.literal("exhaustCards"), filter: CardFilter }).strict(),
    z.object({ op: z.literal("forceResult"), result: z.enum(["succeed", "fail"]) }).strict(),
    z.object({ op: z.literal("redirectDamage") }).strict(),
    z.object({ op: z.literal("defeatEnemy"), nonElite: z.boolean().optional() }).strict(),
    z.object({ op: z.literal("returnCommittedSkill") }).strict(),
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
  "removeDoom",
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
  "discardDeckTop",
  "discardEventCard",
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
  "unlink",
  "link",
  "placeLocation",
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
  "loseActions",
  "endTurn",
  "gainClues",
  "enemyAttack",
  "revealToken",
  "damageAssets",
  "addChaosTokens",
  "forInvestigator",
  "moveEnemy",
  "exhaustCards",
  "forceResult",
  "redirectDamage",
  "defeatEnemy",
  "returnCommittedSkill",
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
  /** at the end of the upkeep phase, after hand sizes are checked (Hired Muscle) */
  "upkeepPhaseEnds",
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
  /** after an investigator has left a location (`location`) for another (Endless Bridge) */
  "leftLocation",
  /** an investigator is about to move into a location (`location`, `key`): cancelling the key cancels the move */
  "wouldMoveIn",
  /** the last card of an investigator's deck is gone (drawn or discarded) */
  "deckEmptied",
  /** an investigator's attack against an enemy ended (`enemy`, `card`: what it was performed with) */
  "enemyFought",
  "agendaAdvances",
  "wouldDiscoverClues",
  "skillTestEnds",
  "wouldRevealToken",
  "cardDrawn",
  /** after an investigator draws 1 or more cards by one effect (`amount`: how many) */
  "cardsDrawn",
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
  /** after an investigator gains clues, discovered or from the token bank (`amount`; `location` when discovered) */
  "cluesGained",
  /** after doom is placed on a card (`card`) */
  "doomPlaced",
  /** damage and/or horror is about to be placed on an investigator, from any source (`key`, `damage`, `horror`) */
  "damageDealt",
  /** after an effect heals horror (`inv`: whose effect, `card`: the healed investigator or asset, `by`: the effect's card, `amount`) */
  "horrorHealed",
  /** an enemy is about to spawn at a location (`enemy`, `location`, `inv`: who drew it) */
  "enemyWouldSpawn",
  /** a skill test is about to succeed (`testId`): Rex's Curse */
  "wouldSucceedSkillTest",
  /** an exhausted enemy is about to ready in the upkeep phase (`enemy`) */
  "enemyWouldReady",
  /**
   * an investigator drew a card from the encounter deck, before it resolves (`inv`, `card`, `key`: cancelling it cancels
   * the card's effects): Ward of Protection 5, Dr. William T. Maleson
   */
  "encounterDrawn",
  /** an attack failed, before its result is applied (`inv`, `margin`, `testId`): Oops! 2 */
  "attackFailed",
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
    tokenValue: z
      .union([z.number(), z.enum(["cluesOnLocation", "horrorOnYou", "resources"])])
      .optional(),
    /** for elderSign kind: effects that resolve when it is revealed, before the result (`effects` wait for a success) */
    onReveal: z.array(Effect).optional(),
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
      /** the ones with the most clues */
      mostClues?: boolean;
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
        mostClues: z.boolean().optional(),
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
    /** "Forced - When this leaves play": where it goes instead (the void, out of the game) and what follows */
    leavesPlay: z
      .object({ to: z.enum(["void", "removed"]).optional(), effects: z.array(Effect).optional() })
      .strict()
      .optional(),
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
    /** a location name, "emptyLocation", "farthestEmptyLocation", "Engaged with Prey", "toYourRight", or an expression */
    spawn: Spawn.optional(),
    /** the enemy enters play exhausted (and so engages no one as it spawns) */
    entersExhausted: z.boolean().optional(),
    /** the enemy can be attacked and damaged only with this card's ability (Brood of Yog-Sothoth: Esoteric Formula) */
    onlyAttackableBy: z.string().optional(),
    /** an investigator its attack would defeat is killed instead (Crazed Shoggoth) */
    killsOnDefeat: z.literal(true).optional(),
    prey: Prey.optional(),
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
    /** only the investigators at a location of this name may spend the clues to advance this act (Saracenic Script) */
    actSpendAt: z.string().optional(),
    /** clues the group spends, per investigator, to enter it while unrevealed (Underground Cistern) */
    enterCluesPerInvestigator: z.number().optional(),
    /** an investigator must hold this many clues to move into it (The Edge of the Universe) */
    moveInClues: z.number().optional(),
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
    /** committed only while this holds for the committer (Inquiring Mind: a clue at your location) */
    commitIf: Condition.optional(),
    /** committed only to a test whose difficulty is at least this much over your base value of its skill (Rise to the Occasion) */
    commitDifficultyOverBase: z.number().optional(),
    /** horror its committer takes as an additional cost to commit it (Soul Link) */
    commitHorror: z.number().optional(),
    /** icons it gains while committed to a skill test another investigator performs (Leadership) */
    iconsOnOthersTest: Icons.optional(),
    /** may be committed after the chaos tokens are revealed, to a test you perform (Timely Intervention) */
    commitAfterReveal: z.boolean().optional(),
    /**
     * may be assigned damage dealt to other investigators at its controller's location (Bodyguard); `damageAndHorror`:
     * horror too (Brother Xavier)
     */
    soaksForLocation: z.union([z.boolean(), z.literal("damageAndHorror")]).optional(),
    /** an "X" cost the player chooses as they play it, up to their resources; `uses`: it enters play with X uses */
    costX: z.literal("uses").optional(),
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
  | { any: LogCondition[] }
  | { not: LogCondition }
  | { playerCount: number }
  | { playersAtLeast: number }
  | { logCount: { key: string; min?: number; max?: number } };
export const LogCondition: z.ZodType<LogCondition> = z.lazy(() =>
  z.union([
    z.object({ logHas: z.string() }).strict(),
    z.object({ any: z.array(LogCondition) }).strict(),
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
  /** a set-aside location (its `copy`-th, from 1) put into play at a place on the map */
  z
    .object({
      do: z.literal("placeLocation"),
      code: z.string(),
      copy: z.number().int().positive().optional(),
      at: Placement,
      when: LogCondition.optional(),
    })
    .strict(),
  /** a link between the first locations in play of two codes (one-way: from `a` to `b`) */
  z
    .object({
      do: z.literal("link"),
      a: z.string(),
      b: z.string(),
      oneWay: z.boolean().optional(),
      when: LogCondition.optional(),
    })
    .strict(),
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
        /** the current agenda's stage (The Essex County Express) */
        "agendaStage",
        /** the total printed cost of the cards this token's `onReveal` discarded from the deck */
        "discardedPrintedCost",
        /** the Brood of Yog-Sothoth in play (Undimensioned and Unseen) */
        "broodInPlay",
        /** the [[Extradimensional]] locations in play; the shroud of the testing investigator's location (Lost in Time and Space) */
        "extradimensionalLocations",
        "yourLocationShroud",
      ])
      .optional(),
    /**
     * "You must either <do>, or <the modifier is N instead / the test automatically fails>": the investigator testing
     * chooses while `can` holds; otherwise the penalty applies. `label` is the "do" option, `key` its translation
     * (`option.<key>`)
     */
    either: z
      .object({
        do: z.array(Effect),
        can: Condition.optional(),
        label: z.string(),
        key: z.string(),
        modifier: z.number().optional(),
        autoFail: z.literal(true).optional(),
      })
      .strict()
      .optional(),
    /**
     * the modifier while a condition holds, for the investigator testing ("−3 instead if you have 3 or more horror"); or
     * `autoFail`: the test automatically fails instead ("If it is Agenda 2, you automatically fail instead")
     */
    instead: z
      .object({
        when: Condition,
        modifier: z.union([z.number(), z.object({ x: z.literal(true) }).strict()]).optional(),
        autoFail: z.literal(true).optional(),
      })
      .strict()
      .optional(),
    /** "Cancel the effects and icons of each skill card committed to this test" (Where Doom Awaits) */
    cancelCommitted: z.literal(true).optional(),
    /** for `x: "tokensOn"`: whose tokens of which name */
    xTokens: z.object({ name: z.string(), on: TokenHolder }).strict().optional(),
    /** X becomes X × xTimes + xPlus */
    xTimes: z.number().optional(),
    /** X counts at most this many ("max −4") */
    xMax: z.number().optional(),
    xPlus: z.number().optional(),
    onReveal: z.array(Effect).optional(),
    /** effects once the test is over ("after this skill test, …"); `ifFailed`: only when it failed */
    afterTest: z
      .object({ effects: z.array(Effect), ifFailed: z.literal(true).optional() })
      .strict()
      .optional(),
    onFail: z.array(Effect).optional(),
    /** effects if the test succeeds ("If you succeed, gain 3 resources") */
    onSuccess: z.array(Effect).optional(),
    /** "You may spend N resources to treat this token as a 0, instead": the investigator testing chooses */
    payToZero: z.number().optional(),
    /** effects only if condition holds when revealed */
    condition: Condition.optional(),
    revealAnother: z
      .union([z.boolean(), z.literal("ifAncientOneInPlay"), z.object({ if: Condition }).strict()])
      .optional(),
  })
  .strict();
export type TokenEffect = z.infer<typeof TokenEffect>;

/** whom an effect is for: every active investigator, the lead, one the players choose, the one an input just named, or those the scenario defeated */
const Who = z.enum(["each", EVENT.Lead, "choice", "input", "defeated"]);

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
  z.object({ do: z.literal("kill"), who: z.enum(["each", "notResigned", "defeated"]) }).strict(),
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
      /** a trait the weakness has, or any one of several (Madness, Injury or Pact) */
      trait: z.union([z.string(), z.array(z.string())]).default(""),
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

/**
 * an act or agenda deck's card: a code, or versions of it: with `when`, the version of the first condition that holds
 * (one condition per version but the last, which is taken when none holds), else one at random
 */
export const DeckEntry = z.union([
  z.string(),
  z
    .object({
      oneOf: z.array(z.string()).min(1),
      when: z.union([LogCondition, z.array(LogCondition).min(1)]).optional(),
    })
    .strict(),
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
    /** "orthogonal": locations on cells that share a side are connected (Tidal Tunnels, In Too Deep) */
    adjacency: z.literal("orthogonal").optional(),
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
  /** every card of a log list leaves every investigator's deck (the sacrificed to Yog-Sothoth) */
  z
    .object({ do: z.literal("removeListed"), id: z.string(), section: z.string().optional() })
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

/** whose campaign state a condition reads: anyone's, the input's, the lead's, or an investigator the scenario defeated */
type WhoInv = "any" | "input" | "lead" | "defeated";
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
const WhoInv = z.enum(["any", "input", EVENT.Lead, "defeated"]);
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

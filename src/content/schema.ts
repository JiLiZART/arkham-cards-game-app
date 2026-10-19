import { z } from "zod";

// ---------- primitives ----------
export const SKILLS = ["willpower", "intellect", "combat", "agility"] as const;
export const Skill = z.enum(SKILLS);
export type Skill = z.infer<typeof Skill>;

export const CHAOS_TOKENS = [
  "+1", "0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8",
  "skull", "cultist", "tablet", "elderThing", "autoFail", "elderSign",
] as const;
export const ChaosToken = z.enum(CHAOS_TOKENS);
export type ChaosToken = z.infer<typeof ChaosToken>;
export const SYMBOL_TOKENS = ["skull", "cultist", "tablet", "elderThing"] as const;
export type SymbolToken = (typeof SYMBOL_TOKENS)[number];

export const CardType = z.enum([
  "investigator", "asset", "event", "skill", "treachery", "enemy", "location", "act", "agenda", "scenario",
  // later cycles: story cards, keys and enemy-locations
  "story", "key", "enemy_location",
]);
export type CardType = z.infer<typeof CardType>;

export const Slot = z.enum(["hand", "arcane", "accessory", "body", "ally", "tarot", "head"]);
export type Slot = z.infer<typeof Slot>;

/** a number, or something computed from the effect context */
export const Amount = z.union([
  z.number(),
  z.enum(["failBy", "succeedBy", "all", "X"]),
  z.object({ perInvestigator: z.number() }),
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
  })
  .strict();
export type CardFilter = z.infer<typeof CardFilter>;

/** who an effect applies to (investigators) */
export const InvTarget = z.enum([
  "you", // controller of the source / the investigator resolving
  "lead",
  "chooseAtLocation", // you choose an investigator at your location
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
  "eachAtLocation",
  "eventEnemy", // enemy from the triggering event / skill test target
  "nearestCultist",
  "nearestEnemy",
]);
export type EnemyTarget = z.infer<typeof EnemyTarget>;

export const Duration = z.enum(["test", "turn", "phase", "round"]);

// ---------- modifiers (constant or temporary) ----------
export const ModStat = z.enum([
  "willpower", "intellect", "combat", "agility",
  "health", "sanity",
  "shroud", "fight", "evade", "enemyHealth", "enemyDamage", "enemyHorror",
  "additionalActions", "handSlots", "arcaneSlots", "allySlots", "accessorySlots", "bodySlots",
  "cost", "attackDamage", "clueBonus", "testValue",
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
  })
  .strict();
export type Modifier = z.infer<typeof Modifier>;

// ---------- conditions ----------
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { yourTurn: true }
  | { cluesOnYourLocation: "none" | "some" }
  | { youHaveClues: "none" | "some" }
  | { enemyAtYourLocation: CardFilter | true }
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
  | { eventCard: CardFilter };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition) }).strict(),
    z.object({ any: z.array(Condition) }).strict(),
    z.object({ not: Condition }).strict(),
    z.object({ yourTurn: z.literal(true) }).strict(),
    z.object({ cluesOnYourLocation: z.enum(["none", "some"]) }).strict(),
    z.object({ youHaveClues: z.enum(["none", "some"]) }).strict(),
    z.object({ enemyAtYourLocation: z.union([CardFilter, z.literal(true)]) }).strict(),
    z.object({ exhaustedEnemyAtYourLocation: z.literal(true) }).strict(),
    z.object({ onlyEngagedEnemy: z.literal(true) }).strict(),
    z.object({ eventEnemy: CardFilter }).strict(),
    z.object({ eventInvestigatorIsYou: z.literal(true) }).strict(),
    z.object({ eventAtYourLocation: z.literal(true) }).strict(),
    z.object({ testKind: z.enum(["investigate", "fight", "evade"]) }).strict(),
    z.object({ failedBy: z.object({ max: z.number() }) }).strict(),
    z.object({ succeededBy: z.object({ min: z.number() }) }).strict(),
    z.object({ tokenIs: z.array(ChaosToken) }).strict(),
    z.object({ tokenNegative: z.literal(true) }).strict(),
    z.object({ resources: z.object({ min: z.number() }) }).strict(),
    z.object({ assetInPlay: CardFilter }).strict(),
    z.object({ controlsCard: z.string() }).strict(),
    z.object({ scenarioFlag: z.string() }).strict(),
    z.object({ phase: z.enum(["mythos", "investigation", "enemy", "upkeep"]) }).strict(),
    z.object({ controlled: z.boolean() }).strict(),
    z.object({ exhausted: z.boolean() }).strict(),
    z.object({ yourSkillTest: z.literal(true) }).strict(),
    z.object({ engaged: z.literal(true) }).strict(),
    z.object({ selfHasClues: z.literal(true) }).strict(),
    z.object({ eventCard: CardFilter }).strict(),
  ]),
);

// ---------- effects ----------
export type Effect =
  | { op: "gainResources"; amount: Amount; target?: InvTarget }
  | { op: "loseResources"; amount: Amount; target?: InvTarget }
  | { op: "drawCards"; amount: Amount; target?: InvTarget }
  | { op: "discoverClues"; amount: Amount; at?: "yourLocation" | "testLocation" }
  | { op: "takeDamage"; amount: Amount; direct?: boolean; target?: InvTarget }
  | { op: "takeHorror"; amount: Amount; direct?: boolean; target?: InvTarget }
  | { op: "heal"; damage?: number; horror?: number; target?: InvTarget }
  | { op: "dealDamage"; amount: Amount; to: EnemyTarget }
  | { op: "placeDoom"; amount: Amount; on: "agenda" | "self" | "nearestCultist" | "nearestEnemy" | "eachCultist" }
  | { op: "placeTokens"; on: "self"; clues?: number; horror?: number; damage?: number; doom?: number; resources?: number }
  | { op: "putInThreatArea" }
  | { op: "attachToLocation"; where: "yours" | "mostClues"; limitOnePerLocation?: boolean }
  | { op: "discardSelf" }
  | { op: "addSelfToVictory" }
  | { op: "removeSelf" }
  | { op: "skillTest"; skill: Skill | Skill[]; difficulty: number; onSuccess?: Effect[]; onFail?: Effect[]; perPointFailed?: Effect[] }
  | { op: "fight"; skill?: Skill; bonus?: number; damageBonus?: number; onSuccess?: Effect[]; onFail?: Effect[]; onTokens?: OnTokens; extraDamageIf?: Condition; extraDamageIfSucceedBy?: number }
  | { op: "investigate"; skill?: Skill; bonus?: number; shroud?: number; insteadOfClues?: Effect[]; onSuccess?: Effect[]; onFail?: Effect[]; onTokens?: OnTokens }
  | { op: "evade"; skill?: Skill; bonus?: number; onSuccess?: Effect[]; onFail?: Effect[]; auto?: boolean; all?: boolean; nonElite?: boolean; onTokens?: OnTokens }
  | { op: "modify"; mod: Modifier; until: z.infer<typeof Duration>; target?: InvTarget }
  | { op: "chooseOne"; options: { label: string; effects: Effect[]; condition?: Condition }[]; chooser?: "you" | "lead" }
  | { op: "discardFromHand"; amount: Amount; random?: boolean; target?: InvTarget }
  | { op: "discardAsset"; orElse?: Effect[] }
  | { op: "discardAllButOneFromHand" }
  | { op: "removeDiscardFromGame" }
  | { op: "drawEncounterCard" }
  | { op: "gainActions"; amount: number }
  | { op: "cancel" } // cancel the triggering attack/revelation/token
  | { op: "disengageAll"; nonTrait?: string }
  | { op: "moveTo"; where: "connecting" | "revealedNoEnemies" | "central" | "choose" }
  | { op: "searchDeck"; top?: number; filter: CardFilter; amount?: number; target?: InvTarget }
  | { op: "lookAtTop"; amount: number }
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
  | { op: "discardEncounterUntil"; filter: CardFilter; count?: number; countIfPlayersAtLeast?: [number, number]; then: "leadDraws" | "spawnAt"; at?: string; doom?: number; shuffleDiscardFirst?: boolean }
  | { op: "dropClues"; amount: Amount }
  | { op: "spendClues"; amount: Amount }
  | { op: "healEnemy"; amount: number }
  | { op: "checkDoom" }
  | { op: "returnSelfToHand" }
  | { op: "script"; fn: string; args?: unknown };

/** extra effects if any of the listed tokens was revealed during the test */
export type OnTokens = { tokens: ChaosToken[]; effects: Effect[] };
const effectsArr = (): z.ZodType<Effect[]> => z.array(Effect);
const OnTokens = (): z.ZodType<OnTokens> => z.object({ tokens: z.array(ChaosToken), effects: effectsArr() }).strict();
export const Effect: z.ZodType<Effect> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({ op: z.literal("gainResources"), amount: Amount, target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("loseResources"), amount: Amount, target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("drawCards"), amount: Amount, target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("discoverClues"), amount: Amount, at: z.enum(["yourLocation", "testLocation"]).optional() }).strict(),
    z.object({ op: z.literal("takeDamage"), amount: Amount, direct: z.boolean().optional(), target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("takeHorror"), amount: Amount, direct: z.boolean().optional(), target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("heal"), damage: z.number().optional(), horror: z.number().optional(), target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("dealDamage"), amount: Amount, to: EnemyTarget }).strict(),
    z.object({ op: z.literal("placeDoom"), amount: Amount, on: z.enum(["agenda", "self", "nearestCultist", "nearestEnemy", "eachCultist"]) }).strict(),
    z.object({ op: z.literal("placeTokens"), on: z.literal("self"), clues: z.number().optional(), horror: z.number().optional(), damage: z.number().optional(), doom: z.number().optional(), resources: z.number().optional() }).strict(),
    z.object({ op: z.literal("putInThreatArea") }).strict(),
    z.object({ op: z.literal("attachToLocation"), where: z.enum(["yours", "mostClues"]), limitOnePerLocation: z.boolean().optional() }).strict(),
    z.object({ op: z.literal("discardSelf") }).strict(),
    z.object({ op: z.literal("addSelfToVictory") }).strict(),
    z.object({ op: z.literal("removeSelf") }).strict(),
    z.object({ op: z.literal("skillTest"), skill: z.union([Skill, z.array(Skill)]), difficulty: z.number(), onSuccess: effectsArr().optional(), onFail: effectsArr().optional(), perPointFailed: effectsArr().optional() }).strict(),
    z.object({ op: z.literal("fight"), skill: Skill.optional(), bonus: z.number().optional(), damageBonus: z.number().optional(), onSuccess: effectsArr().optional(), onFail: effectsArr().optional(), onTokens: OnTokens().optional(), extraDamageIf: Condition.optional(), extraDamageIfSucceedBy: z.number().optional() }).strict(),
    z.object({ op: z.literal("investigate"), skill: Skill.optional(), bonus: z.number().optional(), shroud: z.number().optional(), insteadOfClues: effectsArr().optional(), onSuccess: effectsArr().optional(), onFail: effectsArr().optional(), onTokens: OnTokens().optional() }).strict(),
    z.object({ op: z.literal("evade"), skill: Skill.optional(), bonus: z.number().optional(), onSuccess: effectsArr().optional(), onFail: effectsArr().optional(), auto: z.boolean().optional(), all: z.boolean().optional(), nonElite: z.boolean().optional(), onTokens: OnTokens().optional() }).strict(),
    z.object({ op: z.literal("modify"), mod: Modifier, until: Duration, target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("chooseOne"), options: z.array(z.object({ label: z.string(), effects: effectsArr(), condition: Condition.optional() }).strict()), chooser: z.enum(["you", "lead"]).optional() }).strict(),
    z.object({ op: z.literal("discardFromHand"), amount: Amount, random: z.boolean().optional(), target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("discardAsset"), orElse: effectsArr().optional() }).strict(),
    z.object({ op: z.literal("discardAllButOneFromHand") }).strict(),
    z.object({ op: z.literal("removeDiscardFromGame") }).strict(),
    z.object({ op: z.literal("drawEncounterCard") }).strict(),
    z.object({ op: z.literal("gainActions"), amount: z.number() }).strict(),
    z.object({ op: z.literal("cancel") }).strict(),
    z.object({ op: z.literal("disengageAll"), nonTrait: z.string().optional() }).strict(),
    z.object({ op: z.literal("moveTo"), where: z.enum(["connecting", "revealedNoEnemies", "central", "choose"]) }).strict(),
    z.object({ op: z.literal("searchDeck"), top: z.number().optional(), filter: CardFilter, amount: z.number().optional(), target: InvTarget.optional() }).strict(),
    z.object({ op: z.literal("lookAtTop"), amount: z.number() }).strict(),
    z.object({ op: z.literal("addUses"), amount: z.number(), filter: CardFilter }).strict(),
    z.object({ op: z.literal("surge") }).strict(),
    z.object({ op: z.literal("drawCultistOrSearch") }).strict(),
    z.object({ op: z.literal("spawnSetAside"), code: z.string(), at: z.string().optional() }).strict(),
    z.object({ op: z.literal("putSetAsideIntoPlay"), code: z.string() }).strict(),
    z.object({ op: z.literal("shuffleIntoEncounterDeck"), target: z.literal("eventEnemy") }).strict(),
    z.object({ op: z.literal("takeControl") }).strict(),
    z.object({ op: z.literal("resolution"), id: z.string() }).strict(),
    z.object({ op: z.literal("resign") }).strict(),
    z.object({ op: z.literal("takeFromDiscard"), filter: CardFilter }).strict(),
    z.object({ op: z.literal("discardEncounterUntil"), filter: CardFilter, count: z.number().optional(), countIfPlayersAtLeast: z.tuple([z.number(), z.number()]).optional(), then: z.enum(["leadDraws", "spawnAt"]), at: z.string().optional(), doom: z.number().optional(), shuffleDiscardFirst: z.boolean().optional() }).strict(),
    z.object({ op: z.literal("dropClues"), amount: Amount }).strict(),
    z.object({ op: z.literal("spendClues"), amount: Amount }).strict(),
    z.object({ op: z.literal("healEnemy"), amount: z.number() }).strict(),
    z.object({ op: z.literal("checkDoom") }).strict(),
    z.object({ op: z.literal("returnSelfToHand") }).strict(),
    z.object({ op: z.literal("script"), fn: z.string(), args: z.unknown().optional() }).strict(),
  ]),
);
export const EFFECT_OPS = [
  "gainResources", "loseResources", "drawCards", "discoverClues", "takeDamage", "takeHorror", "heal", "dealDamage",
  "placeDoom", "placeTokens", "putInThreatArea", "attachToLocation", "discardSelf", "addSelfToVictory", "removeSelf",
  "skillTest", "fight", "investigate", "evade", "modify", "chooseOne", "discardFromHand", "discardAsset",
  "discardAllButOneFromHand", "removeDiscardFromGame", "drawEncounterCard", "gainActions", "cancel", "disengageAll",
  "moveTo", "searchDeck", "lookAtTop", "addUses", "surge", "drawCultistOrSearch", "spawnSetAside",
  "putSetAsideIntoPlay", "shuffleIntoEncounterDeck", "takeControl", "resolution", "resign", "checkDoom",
  "takeFromDiscard", "discardEncounterUntil", "dropClues", "spendClues", "healEnemy",
  "returnSelfToHand", "script",
] as const;

// ---------- abilities ----------
export const TRIGGERS = [
  // investigator-side
  "enemyDefeated", "successfulInvestigate", "successfulAttack", "skillTestFailed", "skillTestSucceeded", "wouldFailSkillTest",
  "tokenRevealed", "enemyAttacks", "enemyAttacked", "enemyEvaded", "horrorPlaced", "damageTaken", "horrorTaken",
  "enterPlay", "cardPlayed", "treacheryDrawn", "enemySpawns", "phaseBegins", "turnBegins", "turnEnds", "roundEnds",
  "mythosEnds", "enemyPhaseEnds", "enterLocation", "leaveLocation", "locationInvestigated", "assetDamaged", "enemyEngages",
  "enemyDefeatedSelf", "wouldMoveOut", "agendaAdvances", "wouldDiscoverClues", "skillTestEnds",
] as const;
export const Trigger = z.enum(TRIGGERS);
export type Trigger = z.infer<typeof Trigger>;

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
    discardFromHand: z.number().optional(),
  })
  .strict();
export type Cost = z.infer<typeof Cost>;

export const AbilityKind = z.enum(["action", "fast", "reaction", "forced", "constant", "revelation", "onPlay", "elderSign"]);
export type AbilityKind = z.infer<typeof AbilityKind>;

export const Ability = z
  .object({
    kind: AbilityKind,
    label: z.string().optional(),
    /** for reaction/forced */
    trigger: Trigger.optional(),
    /** action designator, e.g. fight/investigate (counts as that action for AoO and effects) */
    designator: z.enum(["fight", "investigate", "evade", "parley", "resign", "move", "engage"]).optional(),
    actionCost: z.number().optional(), // default 1 for kind=action
    cost: Cost.optional(),
    limit: z.object({ per: z.enum(["test", "turn", "phase", "round", "game"]), count: z.number().default(1), group: z.boolean().optional() }).optional(),
    condition: Condition.optional(),
    effects: z.array(Effect).optional(),
    modifiers: z.array(Modifier).optional(),
    /** who may use it: controller only (default), any investigator at the card's location */
    usableBy: z.enum(["controller", "atLocation", "anyone", "engaged"]).optional(),
    /** for elderSign kind: token modifier */
    tokenValue: z.union([z.number(), z.enum(["cluesOnLocation", "horrorOnYou"])]).optional(),
    /** reaction triggers from hand for fast events (Dodge, Lucky!) */
    fromHand: z.boolean().optional(),
  })
  .strict();
export type Ability = z.infer<typeof Ability>;

// ---------- cards ----------
export const Icons = z
  .object({ willpower: z.number(), intellect: z.number(), combat: z.number(), agility: z.number(), wild: z.number() })
  .partial();

export const CardDef = z
  .object({
    code: z.string(),
    name: z.string(),
    subname: z.string().optional(),
    backName: z.string().optional(),
    type: CardType,
    subtype: z.enum(["weakness", "basicweakness"]).optional(),
    faction: z.string(),
    pack: z.string(),
    encounterSet: z.string().optional(),
    quantity: z.number().default(1),
    deckLimit: z.number().optional(),
    xp: z.number().optional(),
    cost: z.number().nullable().optional(),
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
    // asset / investigator
    health: z.number().optional(),
    sanity: z.number().optional(),
    uses: z.object({ type: z.string(), count: z.number() }).optional(),
    skills: z.object({ willpower: z.number(), intellect: z.number(), combat: z.number(), agility: z.number() }).optional(),
    // enemy
    enemy: z
      .object({
        fight: z.number(),
        health: z.number(),
        healthPerInvestigator: z.boolean().default(false),
        evade: z.number(),
        damage: z.number(),
        horror: z.number(),
      })
      .optional(),
    spawn: z.string().optional(), // location name or "emptyLocation" / "engagedWithPrey"
    prey: z
      .union([
        z.object({ highest: z.enum(["willpower", "intellect", "combat", "agility", "clues", "remainingHealth", "remainingSanity", "cardsInHand"]) }),
        z.object({ lowest: z.enum(["willpower", "intellect", "combat", "agility", "clues", "remainingHealth", "remainingSanity", "cardsInHand"]) }),
        z.literal("bearer"),
      ])
      .optional(),
    // location
    shroud: z.number().optional(),
    clues: z.number().optional(),
    cluesPerInvestigator: z.boolean().optional(),
    // act/agenda
    stage: z.number().optional(),
    doom: z.number().optional(),
    actClues: z.number().optional(),
    actCluesPerInvestigator: z.boolean().optional(),
    /** when the group may spend clues to advance this act (default: any time during a turn) */
    actAdvance: z.enum(["turn", "script"]).optional(),
    /** location investigated with a different skill */
    investigateSkill: Skill.optional(),
    victory: z.number().optional(),
    keywords: z.array(z.enum(["hunter", "retaliate", "aloof", "alert", "massive", "surge", "peril", "fast", "exceptional"])).default([]),
    /** wild/limits */
    maxCommitted: z.number().optional(),
    /** discard the asset when its last use is spent (First Aid, Forbidden Knowledge) */
    discardWhenEmpty: z.boolean().optional(),
    commitOnlyOwnTest: z.boolean().optional(),
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
    names: z.record(z.string(), z.object({ name: z.string(), subname: z.string().optional() }).strict()).optional(),
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
    z.object({ logCount: z.object({ key: z.string(), min: z.number().optional(), max: z.number().optional() }) }).strict(),
  ]),
);

/** scenario setup steps, performed in order */
export const SetupStep = z.discriminatedUnion("do", [
  z.object({ do: z.literal("putIntoPlay"), codes: z.array(z.string()), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("putRandomIntoPlay"), from: z.array(z.string()), count: z.number(), removeRest: z.boolean().default(true), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("setAside"), codes: z.array(z.string()), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("remove"), codes: z.array(z.string()), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("startAt"), code: z.string(), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("spawn"), code: z.string(), at: z.string(), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("shuffleIntoEncounter"), codes: z.array(z.string()), create: z.boolean().optional(), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("placeDoomOnAgenda"), amount: z.number(), when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("addChaosToken"), token: ChaosToken, when: LogCondition.optional() }).strict(),
  z.object({ do: z.literal("discardRandomFromHands"), amount: z.number(), when: LogCondition.optional() }).strict(),
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
      ])
      .optional(),
    onReveal: z.array(Effect).optional(),
    onFail: z.array(Effect).optional(),
    /** effects only if condition holds when revealed */
    condition: Condition.optional(),
    revealAnother: z.union([z.boolean(), z.literal("ifAncientOneInPlay")]).optional(),
  })
  .strict();
export type TokenEffect = z.infer<typeof TokenEffect>;

/** whom an effect is for: every active investigator, the lead, one the players choose, or the one an input just named */
const Who = z.enum(["each", "lead", "choice", "input"]);

export const CampaignEffect = z.discriminatedUnion("do", [
  z.object({ do: z.literal("record"), key: z.string(), value: z.union([z.boolean(), z.string(), z.array(z.string())]).default(true), section: z.string().optional(), text: z.string().optional() }).strict(),
  z.object({ do: z.literal("crossOut"), key: z.string(), section: z.string().optional(), erase: z.boolean().optional() }).strict(),
  z.object({ do: z.literal("crossOutIfInVictory"), key: z.string(), code: z.string() }).strict(),
  z.object({ do: z.literal("recordCards"), key: z.string(), source: z.enum(["victoryUniqueCultists", "remainingUniqueCultists"]) }).strict(),
  z.object({ do: z.literal("xp"), bonus: z.number().default(0), who: Who.exclude(["choice"]).default("each"), victory: z.boolean().default(false) }).strict(),
  z.object({ do: z.literal("trauma"), who: Who.exclude(["choice"]), physical: z.number().default(0), mental: z.number().default(0) }).strict(),
  z.object({ do: z.literal("kill"), who: z.enum(["each", "notResigned"]) }).strict(),
  z.object({ do: z.literal("earnCard"), code: z.string(), who: Who }).strict(),
  z.object({ do: z.literal("removeCard"), code: z.string(), who: Who.exclude(["choice"]).optional() }).strict(),
  z.object({ do: z.literal("addWeakness"), trait: z.string().default(""), who: Who.exclude(["choice"]).optional() }).strict(),
  z.object({ do: z.literal("addChaosToken"), token: ChaosToken }).strict(),
  z.object({ do: z.literal("end"), result: z.enum(["win", "lose", "survived"]) }).strict(),
]);
export type CampaignEffect = z.infer<typeof CampaignEffect>;

export const Resolution = z
  .object({
    title: z.string(),
    text: z.string(),
    effects: z.array(CampaignEffect),
    when: LogCondition.optional(),
  })
  .strict();
export type Resolution = z.infer<typeof Resolution>;

export const ScenarioDef = z
  .object({
    id: z.string(),
    name: z.string(),
    card: z.string(),
    intro: z.string().optional(),
    encounterSets: z.array(z.string()),
    /** encounter sets that form a separate deck (e.g. Midnight Masks Cultist deck) */
    sideDecks: z.record(z.string(), z.array(z.string())).default({}),
    /** pick one of these sets at random and add to encounter deck */
    randomEncounterSet: z.array(z.string()).optional(),
    acts: z.array(z.string()),
    agendas: z.array(z.string()),
    setup: z.array(SetupStep),
    tokens: z.record(z.enum(["easy", "standard", "hard", "expert"]), z.record(z.enum(["skull", "cultist", "tablet", "elderThing"]), TokenEffect)),
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
  z.object({ do: z.literal("count"), id: z.string(), section: z.string().optional(), op: z.enum(["add", "set"]), value: FlowAmount }).strict(),
  z.object({ do: z.literal("listCards"), id: z.string(), section: z.string().optional(), codes: z.array(z.string()), remove: z.boolean().default(false) }).strict(),
  z.object({ do: z.literal("investigatorCount"), id: z.string(), section: z.string().optional(), who: Who.exclude(["choice"]), op: z.enum(["add", "set"]), value: FlowAmount }).strict(),
  z.object({ do: z.literal("removeChaosToken"), token: ChaosToken }).strict(),
  z.object({ do: z.literal("replaceCard"), old: z.string(), new: z.string(), who: Who.exclude(["choice"]) }).strict(),
  z.object({ do: z.literal("nextScenario"), scenario: z.string() }).strict(),
  z.object({ do: z.literal("skipScenario"), scenario: z.string() }).strict(),
  z.object({ do: z.literal("replayScenario"), scenario: z.string() }).strict(),
  z.object({ do: z.literal("setData"), key: z.string(), value: z.union([z.boolean(), z.number(), z.string()]) }).strict(),
]);
export type FlowEffect = z.infer<typeof FlowEffect>;

type WhoInv = "any" | "input" | "lead";
export type FlowCondition =
  | { kind: "logHas"; id: string; section?: string }
  | { kind: "logCrossedOut"; id: string; section?: string }
  | { kind: "logCount"; id: string; section?: string; min?: number; max?: number }
  | { kind: "logCards"; id: string; section?: string; card?: string }
  | { kind: "investigatorCount"; id: string; section?: string; inv: WhoInv; min?: number; max?: number }
  | { kind: "scenarioCompleted"; scenario: string; resolution?: string }
  | { kind: "difficulty"; is: z.infer<typeof Difficulty>[] }
  | { kind: "playerCount"; min?: number; max?: number }
  | { kind: "trauma"; inv: WhoInv; physical?: number; mental?: number }
  | { kind: "hasCard"; card: string; inv: WhoInv }
  | { kind: "data"; key: string; equals?: boolean | number | string; min?: number }
  | { kind: "not"; condition: FlowCondition }
  | { kind: "all"; conditions: FlowCondition[] }
  | { kind: "any"; conditions: FlowCondition[] }
  /** a test the game can't make (partners, supplies, linked campaigns): it takes the guide's default `take` */
  | { kind: "unsupported"; name: string; take: boolean };
const WhoInv = z.enum(["any", "input", "lead"]);
export const FlowCondition: z.ZodType<FlowCondition> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("logHas"), id: z.string(), section: z.string().optional() }).strict(),
    z.object({ kind: z.literal("logCrossedOut"), id: z.string(), section: z.string().optional() }).strict(),
    z.object({ kind: z.literal("logCount"), id: z.string(), section: z.string().optional(), min: z.number().optional(), max: z.number().optional() }).strict(),
    z.object({ kind: z.literal("logCards"), id: z.string(), section: z.string().optional(), card: z.string().optional() }).strict(),
    z.object({ kind: z.literal("investigatorCount"), id: z.string(), section: z.string().optional(), inv: WhoInv, min: z.number().optional(), max: z.number().optional() }).strict(),
    z.object({ kind: z.literal("scenarioCompleted"), scenario: z.string(), resolution: z.string().optional() }).strict(),
    z.object({ kind: z.literal("difficulty"), is: z.array(Difficulty) }).strict(),
    z.object({ kind: z.literal("playerCount"), min: z.number().optional(), max: z.number().optional() }).strict(),
    z.object({ kind: z.literal("trauma"), inv: WhoInv, physical: z.number().optional(), mental: z.number().optional() }).strict(),
    z.object({ kind: z.literal("hasCard"), card: z.string(), inv: WhoInv }).strict(),
    z.object({ kind: z.literal("data"), key: z.string(), equals: z.union([z.boolean(), z.number(), z.string()]).optional(), min: z.number().optional() }).strict(),
    z.object({ kind: z.literal("not"), condition: FlowCondition }).strict(),
    z.object({ kind: z.literal("all"), conditions: z.array(FlowCondition) }).strict(),
    z.object({ kind: z.literal("any"), conditions: z.array(FlowCondition) }).strict(),
    z.object({ kind: z.literal("unsupported"), name: z.string(), take: z.boolean() }).strict(),
  ]),
);

const StepIds = z.array(z.string()).default([]);
const FlowChoice = z.object({ id: z.string(), text: z.string(), effects: z.array(FlowEffect).default([]), steps: StepIds, when: FlowCondition.optional() }).strict();
export type FlowChoice = z.infer<typeof FlowChoice>;

/** one thing a campaign shows or asks (the prompts are `chooseOne` … `unsupported`); steps are keyed by id in `CampaignFlow.steps` and named by the steps around them */
export const CampaignStep = z.discriminatedUnion("kind", [
  /** read: a title, the text, bullets (the log entries a step records are read as bullets) */
  z.object({ kind: z.literal("story"), title: z.string().optional(), text: z.string().optional(), bullets: z.array(z.string()).default([]) }).strict(),
  z.object({ kind: z.literal("branch"), condition: FlowCondition, then: StepIds, else: StepIds }).strict(),
  z.object({ kind: z.literal("effects"), effects: z.array(FlowEffect) }).strict(),
  z.object({ kind: z.literal("chooseOne"), title: z.string().optional(), text: z.string().optional(), choices: z.array(FlowChoice).min(1) }).strict(),
  /** a number with limits; its effects take it as "input" */
  z.object({ kind: z.literal("counter"), title: z.string().optional(), text: z.string().optional(), min: z.number().default(0), max: z.number().optional(), effects: z.array(FlowEffect).default([]), steps: StepIds }).strict(),
  /** an investigator among the active ones; the effects and steps follow with them as "input" */
  z.object({ kind: z.literal("investigatorChoice"), title: z.string().optional(), text: z.string().optional(), optional: z.boolean().default(false), effects: z.array(FlowEffect).default([]), steps: StepIds }).strict(),
  /** cards among `codes` (or among the investigators' decks when empty); the effects take them as code "$input" */
  z.object({ kind: z.literal("cardChoice"), title: z.string().optional(), text: z.string().optional(), codes: z.array(z.string()).default([]), min: z.number().default(1), max: z.number().default(1), effects: z.array(FlowEffect).default([]), steps: StepIds }).strict(),
  z.object({ kind: z.literal("checklist"), title: z.string().optional(), text: z.string().optional(), min: z.number().default(0), max: z.number().optional(), choices: z.array(FlowChoice).min(1) }).strict(),
  /** side scenarios on offer: accepting one pays its cost and plays it before the flow goes on */
  z.object({ kind: z.literal("sideScenario"), title: z.string().optional(), text: z.string().optional(), scenarios: z.array(z.object({ scenario: z.string(), cost: z.number().default(0) }).strict()).min(1) }).strict(),
  /** a prompt the game can't offer (linked campaigns, partners, supplies, text entry…): the guide's text, then its default */
  z.object({ kind: z.literal("unsupported"), name: z.string(), title: z.string().optional(), text: z.string().optional(), effects: z.array(FlowEffect).default([]), steps: StepIds }).strict(),
  z.object({ kind: z.literal("upgradeDecks") }).strict(),
  z.object({ kind: z.literal("end"), result: z.enum(["win", "lose", "survived"]).optional() }).strict(),
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
    interludes: z.record(z.string(), z.object({ kind: z.enum(["interlude", "epilogue"]), name: z.string().optional(), steps: StepIds }).strict()).default({}),
    resolutions: z.record(z.string(), z.record(z.string(), StepIds)).default({}),
    steps: z.record(z.string(), CampaignStep),
  })
  .strict()
  .superRefine((f, ctx) => {
    const need = (path: (string | number)[], id: string) => {
      if (!f.steps[id]) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `unknown step ${id}` });
    };
    f.setup.forEach((id, n) => need(["setup", n], id));
    for (const [k, i] of Object.entries(f.interludes)) i.steps.forEach((id, n) => need(["interludes", k, "steps", n], id));
    for (const [sc, byRes] of Object.entries(f.resolutions)) for (const [r, ids] of Object.entries(byRes)) ids.forEach((id, n) => need(["resolutions", sc, r, n], id));
    for (const [k, st] of Object.entries(f.steps)) stepRefs(st).forEach((id, n) => need(["steps", k, n], id));
  });
export type CampaignFlow = z.infer<typeof CampaignFlow>;

/** how a section of the campaign log is kept and shown */
export const LOG_SECTION_KINDS = ["entries", "count", "cards", "investigatorCount"] as const;
export const LogSection = z.object({ id: z.string(), kind: z.enum(LOG_SECTION_KINDS), label: z.string() }).strict();
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
    /** the card packs its scenarios use; loaded before the campaign starts or restores */
    packs: z.array(z.string()).default(["core"]),
    /** generated from the campaign guides (ADR-0007): cards without written behaviour have no effect */
    generated: z.boolean().default(false),
    /** the first scenario's reference card: its art on the new-game screen before the scenarios are loaded */
    card: z.string().optional(),
    /** the campaign guide's opening text (an epigraph, or a story) and its scenarios' names, for the new-game tile */
    prologue: z.string().optional(),
    scenarioNames: z.array(z.string()).optional(),
    /** the campaign log's sections, as the guide prints them (the notes section is always there) */
    logSections: z.array(LogSection).default([]),
    /** every scenario's reference card, in order, with the interludes marked: the picker's sidebar before the scenarios load */
    cards: z.array(z.object({ scenario: z.string(), name: z.string().optional(), code: z.string().optional(), interlude: z.boolean().optional() }).strict()).default([]),
  })
  .strict();
export type CampaignDef = z.infer<typeof CampaignDef>;

// ---------- sounds ----------

/** one audio file with its provenance; every clip in the game is CC0 */
const SoundClip = z
  .object({
    /** file name under public/sounds (effects: .mp3; music: the stem, served as .m4a and .webm) */
    file: z.string().min(1),
    /** a mix offset on top of the import's fixed loudness (ADR-0009) */
    gain: z.number().min(0.5).max(1.5).default(1),
    source: z.string().url(),
    author: z.string().min(1),
    license: z.literal("CC0"),
    /** the original's path under sounds-src/, for the import script */
    original: z.string().optional(),
    /** seconds to keep of the original [start, end] */
    trim: z.tuple([z.number().min(0), z.number().min(0)]).optional(),
  })
  .strict();
const SoundTrack = SoundClip.extend({ loop: z.boolean().default(true), loopStart: z.number().min(0).optional(), loopEnd: z.number().min(0).optional() }).strict();
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
    /** "bed:<scenarioId>", "fight", "tension" */
    music: z.record(z.string(), SoundTrack),
    events: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    moments: z.record(z.string(), z.string()),
    traits: z.record(CardSoundWhen, z.record(z.string(), z.string())).default({}),
    cards: z.record(z.string(), z.record(CardSoundWhen, z.string())).default({}),
  })
  .strict()
  .superRefine((m, ctx) => {
    const need = (path: (string | number)[], id: string) => {
      if (!m.effects[id]) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `unknown clip ${id}` });
    };
    for (const [k, v] of Object.entries(m.events)) (Array.isArray(v) ? v : [v]).forEach((id, n) => need(["events", k, ...(Array.isArray(v) ? [n] : [])], id));
    for (const [k, id] of Object.entries(m.moments)) if (id !== NO_SOUND) need(["moments", k], id);
    for (const [when, byTrait] of Object.entries(m.traits)) for (const [trait, id] of Object.entries(byTrait)) need(["traits", when, trait], id);
    for (const [code, byWhen] of Object.entries(m.cards)) for (const [when, id] of Object.entries(byWhen)) need(["cards", code, when], id);
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
    slots: z.record(z.string(), z.object({ kind: z.enum(["effect", "music"]), where: z.string().min(1), candidates: z.array(SoundCandidate).min(CANDIDATES_RANGE[0]).max(CANDIDATES_RANGE[1]) }).strict()),
  })
  .strict();
export type SoundCandidates = z.infer<typeof SoundCandidates>;

export const EMPTY_SOUNDS: SoundManifest = { effects: {}, music: {}, events: {}, moments: {}, traits: {}, cards: {} };

export const I18nCards = z.record(z.string(), z.object({ name: z.string().optional(), text: z.string().optional(), backText: z.string().optional(), subname: z.string().optional(), backName: z.string().optional(), traits: z.array(z.string()).optional() }).strict());
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
            steps: z.record(z.string(), z.object({ title: z.string().optional(), text: z.string().optional(), choices: z.record(z.string(), z.string()).optional() }).strict()).default({}),
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
            resolutions: z.record(z.string(), z.object({ title: z.string().optional(), text: z.string().optional() }).strict()).default({}),
          })
          .strict(),
      )
      .default({}),
    encounterSets: z.record(z.string(), z.string()).default({}),
  })
  .strict();
export type I18nCampaigns = z.infer<typeof I18nCampaigns>;

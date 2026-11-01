/** what the replay oracle records: every hand-written scenario at one, two and four investigators, and whole campaigns */
import { deckCodes, setup } from "../testkit";
import type { GameSetup } from "../types";
import coverage from "./coverage.json";
import type { CampaignRecipe, GameRecipe, Player } from "./record";

/** a game recipe whose setup is made once its packs are loaded (a generated starter deck comes with its pack) */
export type GameRecipeSpec = Omit<GameRecipe, "setup"> & { setup: () => GameSetup };

const ZEALOT = ["the-gathering", "the-midnight-masks", "the-devourer-below"];
const BRETHREN = ["spreading-flames", "smoke-and-mirrors", "queen-of-ash"];

/** a campaign log that opens each Brethren scenario's branches (as the brethren tests do) */
const BRETHREN_LOG: Record<string, Record<string, unknown>> = {
  "smoke-and-mirrors": { miskatonic_university_burned: true },
  "queen-of-ash": { discovered_the_cults_whereabouts: true, killed_the_servant_of_flame: true },
};

const TEAMS: string[][] = [["01001"], ["01002", "01003"], ["01004", "01005", "01001", "01002"]];

function scenarioRecipes(scenario: string, k: number): GameRecipeSpec[] {
  const brethren = BRETHREN.includes(scenario);
  const base = (invs: string[], seed: number, ui: boolean) =>
    setup(scenario, invs, seed, {
      ...(brethren
        ? { campaignId: "brethren-of-ash", campaignLog: BRETHREN_LOG[scenario] ?? {} }
        : {}),
      // the UI's games wait for phases and deck taps: half the corpus plays that way
      ...(ui ? { pacePhases: true, tapDecks: true } : {}),
    });
  const packs = brethren ? ["core_2026"] : [];
  return [
    ...TEAMS.map((invs, n): GameRecipeSpec => ({
      id: `${scenario}-bot-${invs.length}`,
      packs,
      setup: () => base(invs, 10 + k * 3 + n, (k + n) % 2 === 0),
      player: "bot",
      maxChoices: 3000,
    })),
    {
      id: `${scenario}-random-2`,
      packs,
      setup: () => base(TEAMS[1], 50 + k, k % 2 === 1),
      player: "random",
      maxChoices: 400,
    },
  ];
}

/**
 * Teams of investigators beyond the core five, with their generated starter decks, so the corpus runs their cards'
 * scripts too. Pack lists stay nested (each team's packs include the previous team's): packs load in that order.
 */
const SIX = ["core_2026", "tcu", "dwl", "eoe", "ptc", "tfa"];
const STARTER_TEAMS: { invs: string[]; packs: string[] }[] = [
  { invs: ["05001", "05002"], packs: ["core_2026", "tcu"] },
  // the core 2026 starter decks reach into other cycles' packs
  { invs: ["12001", "12004"], packs: SIX },
  { invs: ["12007", "12010", "12013"], packs: [...SIX, "tic", "tsk"] },
];

function starterRecipes(
  { invs, packs }: (typeof STARTER_TEAMS)[number],
  k: number,
): GameRecipeSpec[] {
  const team = (scenario: string, seed: number): GameSetup => ({
    campaignId: BRETHREN.includes(scenario) ? "brethren-of-ash" : "night-of-the-zealot",
    scenarioId: scenario,
    difficulty: "standard",
    seed,
    investigators: invs.map((code) => ({ code, deck: deckCodes(`${code}-starter`) })),
  });
  const name = invs.join("-");
  return ["the-gathering", "spreading-flames"].flatMap((scenario, n): GameRecipeSpec[] => [
    {
      id: `${scenario}-bot-${name}`,
      packs,
      setup: () => team(scenario, 70 + k * 5 + n),
      player: "bot",
      maxChoices: 3000,
    },
    {
      id: `${scenario}-random-${name}`,
      packs,
      setup: () => team(scenario, 90 + k * 5 + n),
      player: "random",
      maxChoices: 600,
    },
  ]);
}

/** the corpus's own games: every scenario at each team size, and the starter-deck teams */
export const BASE_GAME_RECIPES: GameRecipeSpec[] = [
  ...[...ZEALOT, ...BRETHREN].flatMap(scenarioRecipes),
  ...STARTER_TEAMS.flatMap(starterRecipes),
];

/** a game left open on its seed: what the seed search (`pnpm search:games`) plays */
export interface Template {
  id: string;
  packs: string[];
  player: Player;
  maxChoices: number;
  setup: (seed: number) => GameSetup;
}

/** core teams that bring the core player cards with abilities (Daisy's Necronomicon, Wendy's Amulet, Agnes's spells) */
const CORE_TEAMS = [
  ["01002", "01004"],
  ["01005", "01001", "01003"],
  ["01001", "01002", "01003", "01004"],
];
/** campaign logs that open each scenario's later branches (the Devourer's escaped cultists spawn at its act 1's back) */
const LOGS: Record<string, Record<string, unknown>> = {
  ...BRETHREN_LOG,
  "the-devourer-below": { cultistsGotAway: ["01137", "01139"] },
};

/**
 * Player cards with scripts that no starter deck holds (they cost experience, or come from a pack no team plays): the
 * mixed templates add them to each investigator's deck when their pack is loaded, so they get drawn and played.
 */
const EXTRAS: Record<string, string[]> = {
  core: ["01041", "01056", "01068", "01071", "01082"],
  core_2026: ["12043", "12068", "12070", "12082", "12084"],
  tcu: ["05009"],
};
const extrasFor = (packs: string[]) => ["core", ...packs].flatMap((p) => EXTRAS[p] ?? []);

/** every hand-written scenario with every team, played long by the seeded random player, and by the mixed one with the extra cards in its decks */
export function templates(): Template[] {
  const teams = [
    ...CORE_TEAMS.map((invs) => ({ invs, packs: [] as string[], starter: false })),
    ...STARTER_TEAMS.map((t) => ({ ...t, starter: true })),
  ];
  return [...ZEALOT, ...BRETHREN].flatMap((scenario) =>
    teams.flatMap(({ invs, packs, starter }) =>
      (["random", "mixed"] as const).map((player): Template => {
        const teamPacks = BRETHREN.includes(scenario) && !starter ? ["core_2026"] : packs;
        const brethren = BRETHREN.includes(scenario);
        return {
          id: `${scenario}-${invs.join("-")}${player === "mixed" ? "-mixed" : ""}`,
          // the core teams need core_2026 only for Brethren's scenarios; the starter teams always do
          packs: teamPacks,
          player,
          maxChoices: 1500,
          setup: (seed) => ({
            campaignId: brethren ? "brethren-of-ash" : "night-of-the-zealot",
            scenarioId: scenario,
            difficulty: "standard",
            seed,
            investigators: invs.map((code) => ({
              code,
              deck: [
                ...deckCodes(starter ? `${code}-starter` : DECK_OF[code]),
                ...(player === "mixed" ? extrasFor(teamPacks) : []),
              ],
            })),
            campaignLog: LOGS[scenario] ?? {},
          }),
        };
      }),
    ),
  );
}
const DECK_OF: Record<string, string> = {
  "01001": "roland-starter",
  "01002": "daisy-starter",
  "01003": "skids-starter",
  "01004": "agnes-starter",
  "01005": "wendy-starter",
};

/** the seeds the search kept: each runs a script nothing else in the corpus does */
export const COVERAGE_RECIPES: GameRecipeSpec[] = (
  coverage as { template: string; seed: number }[]
).map(({ template, seed }) => {
  const t = templates().find((x) => x.id === template);
  if (!t) throw new Error(`coverage.json names an unknown template ${template}`);
  return {
    id: `cover-${template}-${seed}`,
    packs: t.packs,
    player: t.player,
    maxChoices: t.maxChoices,
    setup: () => t.setup(seed),
  };
});

export const GAME_RECIPES: GameRecipeSpec[] = [...BASE_GAME_RECIPES, ...COVERAGE_RECIPES];

export const CAMPAIGN_RECIPES: CampaignRecipe[] = [
  {
    id: "night-of-the-zealot-campaign-1",
    packs: [],
    start: {
      campaignId: "night-of-the-zealot",
      difficulty: "easy",
      seed: 11,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    },
    maxChoices: 3000,
  },
  {
    id: "night-of-the-zealot-campaign-2",
    packs: [],
    start: {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 23,
      investigators: [
        { code: "01002", deckId: "daisy-starter" },
        { code: "01005", deckId: "wendy-starter" },
      ],
    },
    maxChoices: 3000,
  },
  {
    id: "brethren-of-ash-campaign-1",
    packs: ["core_2026"],
    start: {
      campaignId: "brethren-of-ash",
      difficulty: "easy",
      seed: 5,
      investigators: [{ code: "01001", deckId: "roland-starter" }],
    },
    maxChoices: 3000,
  },
];

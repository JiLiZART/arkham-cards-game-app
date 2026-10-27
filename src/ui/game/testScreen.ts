/** the skill-test screen's pure parts: what is tested, what is placed, the calculation strip, where the discs spill */
import type { G } from "../../engine/core";
import { testParts, tokenTotal } from "../../engine/rules/skillTest";
import type {
  ChoiceOption,
  ContentDb,
  GameState,
  InstId,
  InvId,
  PendingChoice,
  SkillTestState,
} from "../../engine/types";
import { choicesOffered, type Looking } from "../state/players";

const gOf = (game: GameState, db: ContentDb): G => ({ s: game, db, events: [] });

export type Subject = { kind: "card"; id: InstId } | { kind: "portrait"; inv: InvId };

/** what the test is about: the card it is against (enemy, location), else the card that called for it, else the investigator */
export function subjectOf(test: SkillTestState, game: Pick<GameState, "cards">): Subject {
  const id = [test.target, test.source].find((c): c is InstId => !!c && !!game.cards[c]);
  return id ? { kind: "card", id } : { kind: "portrait", inv: test.inv };
}

export interface PlacedCard {
  card: InstId;
  owner: InvId;
  /** icons it adds to this test's skill */
  icons: number;
  /** the deciding player may take it back now */
  removable: boolean;
}

/** the committed cards in placement order; removable when their owner is the one deciding and a take-back option is offered */
export function placedCards(
  test: SkillTestState,
  game: GameState,
  db: ContentDb,
  pending: PendingChoice | null,
): PlacedCard[] {
  const icons = new Map(testParts(gOf(game, db), test).icons.map((i) => [i.card, i.n]));
  return test.committed.map((card, k) => {
    const owner = test.committers[k];
    return {
      card,
      owner,
      icons: icons.get(card) ?? 0,
      removable:
        !!pending &&
        pending.kind === "commit" &&
        pending.inv === owner &&
        pending.options.some((o) => o.id === `un:${card}`),
    };
  });
}

export interface CalcParts {
  skill: string;
  base: number;
  /** each placed card's icons */
  icons: number[];
  mods: number;
  /** the tokens revealed so far with their resolved modifiers */
  tokens: { token: string; mod: number }[];
  autoFail: boolean;
  total: number;
  difficulty: number;
}

/** the strip: skill, placed icons, modifiers and the first `revealed` tokens, summed against the difficulty */
export function calcParts(
  test: SkillTestState,
  game: GameState,
  db: ContentDb,
  revealed: number,
): CalcParts {
  const g = gOf(game, db);
  const p = testParts(g, test);
  const shown = {
    ...test,
    tokens: test.tokens.slice(0, revealed),
    tokenMods: test.tokenMods.slice(0, revealed),
  };
  const autoFail = shown.tokens.includes("autoFail");
  return {
    skill: test.skill,
    base: p.base,
    icons: p.icons.map((i) => i.n),
    mods: p.mods,
    tokens: shown.tokens.map((token, k) => ({ token, mod: shown.tokenMods[k] ?? 0 })),
    autoFail,
    total: autoFail ? 0 : Math.max(0, p.total + tokenTotal(g, shown)),
    difficulty: p.difficulty,
  };
}

/** a strip with these tokens added (`exact`: the engine's own total once known); the tokens already in it stay */
export function addTokens(
  calc: CalcParts,
  tokens: { token: string; mod: number }[],
  exact?: number,
): CalcParts {
  if (!tokens.length) return calc;
  const autoFail = calc.autoFail || tokens.some((t) => t.token === "autoFail");
  const sum = tokens.reduce((n, t) => n + t.mod, 0);
  return {
    ...calc,
    tokens: [...calc.tokens, ...tokens],
    autoFail,
    total: autoFail ? 0 : (exact ?? Math.max(0, calc.total + sum)),
  };
}

/** an animated event that belongs to a skill test's draw or result */
export const isTestEvent = (
  e: { type: string; data?: Record<string, unknown> } | null | undefined,
) => !!e && (e.type === "token" || e.type === "testResult") && typeof e.data?.testId === "number";

/**
 * Which test's screen is up now, or null. The events of a test (its draw and result) keep it open after the state has
 * moved on; a live test opens it at its commit prompt and keeps it through later prompts until its result is in.
 * Events that come before the test (an attack of opportunity, an encounter card) play first: the screen opens after them.
 */
export function sessionId(p: {
  /** token and result events still to play, in order */
  events: { type: string; data?: Record<string, unknown> }[];
  /** the event playing now, else the next in the queue */
  lead: { type: string } | null;
  live: number | null;
  /** the live test's result is already in the log */
  resolved: boolean;
  commitPending: boolean;
  /** the test whose screen was up on the previous render */
  started: number | null;
}): number | null {
  const id = p.events[0]
    ? (p.events[0].data!.testId as number)
    : p.live !== null && !p.resolved && (p.commitPending || p.started === p.live)
      ? p.live
      : null;
  if (
    id !== null &&
    p.started !== id &&
    p.lead &&
    p.lead.type !== "token" &&
    p.lead.type !== "testResult"
  )
    return null;
  return id;
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** small deterministic generator (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Disc centres for a spill of n discs of diameter `size` inside `area`: a grid of cells with each disc nudged inside
 * its own cell (so none overlap), the cells picked in seeded random order. When the area is too small the discs shrink.
 */
export function spillLayout(
  n: number,
  seed: number,
  area: Area,
  size: number,
): { size: number; points: { x: number; y: number }[] } {
  const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt((n * area.w) / area.h))));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(area.w / cols, area.h / rows);
  const d = Math.min(size, cell);
  const slack = (cell - d) / 2;
  const rand = rng(seed);
  const cells = Array.from({ length: cols * rows }, (_, k) => k);
  for (let k = cells.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [cells[k], cells[j]] = [cells[j], cells[k]];
  }
  const x0 = area.x + (area.w - cols * cell) / 2;
  const y0 = area.y + (area.h - rows * cell) / 2;
  const points = cells.slice(0, n).map((c) => ({
    x: x0 + (c % cols) * cell + cell / 2 + (rand() * 2 - 1) * slack,
    y: y0 + Math.floor(c / cols) * cell + cell / 2 + (rand() * 2 - 1) * slack,
  }));
  return { size: d, points };
}

/** the option that finishes committing, while the viewer's commit window is open on screen: tapping the subject chooses it (Done) */
export function finishOption(game: GameState, view: Looking): ChoiceOption | null {
  const p = game.pending;
  if (!p || p.kind !== "commit" || !choicesOffered(game, view)) return null;
  return p.options.find((o) => o.id === "done") ?? null;
}

/** where the tossed bag lands on the stage: the middle of the subject's lower part, so the tokens spill over the card */
export const bagLanding = (subject: Area): { x: number; y: number } => ({
  x: subject.x + subject.w / 2,
  y: subject.y + subject.h * 0.72,
});

/** how the play strip shows: as usual, compact while one of its cards has an option during a test (a fast ability), else out of the way */
export type StripMode = "normal" | "compact" | "aside";
export function stripDuringTest(
  testing: boolean,
  stripCards: InstId[],
  optionsByCard: Map<InstId, unknown[]>,
): StripMode {
  if (!testing) return "normal";
  return stripCards.some((id) => optionsByCard.get(id)?.length) ? "compact" : "aside";
}

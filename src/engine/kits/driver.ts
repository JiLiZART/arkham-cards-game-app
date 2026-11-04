/**
 * The scenario driver for engine tests (not used at runtime): start a game at its first turn, rig the chaos bag, answer
 * neutrally until a moment the test cares about, and take actions by intent. Tests assert on prompts, events and views;
 * only this kit (and `mutate`) reads the step stack (ADR-0029).
 */
import type { ChaosToken } from "../../content/schema";
import { card, inv, push, reveal, setController, setCounter, type GameContext } from "../context";
import { createGame, type Result } from "../index";
import { run } from "../steps/dispatch";
import { createCard, link, moveCard } from "../movement";
import { cardsIn } from "../queries";
import { ZONE } from "../world/constants";
import type { GameSetup, InvId, Step, TurnAction } from "../world/types";
import { db, DECK_BY_INV, deckCodes, gOf, mutate, pick, putEnemy, skipMulligans } from "./testkit";

export { options } from "./testkit";

const CAP = 120;
const DEFAULT_ENEMY = "01160"; // Ghoul Minion

export interface GameOpts {
  scenario?: string;
  investigators: InvId[];
  seed?: number;
  bag?: ChaosToken[];
  prep?: (game: GameContext) => void;
  /** more of the setup: the campaign, its log, tapped decks... */
  extra?: Partial<GameSetup>;
}

/** the investigators (each with their starter deck, others with Roland's) at the start of the first turn, `prep` applied */
export function game({
  scenario = "the-gathering",
  investigators,
  seed = 1,
  bag,
  prep,
  extra,
}: GameOpts): Result {
  const s: GameSetup = {
    campaignId: "night-of-the-zealot",
    scenarioId: scenario,
    difficulty: "standard",
    seed,
    ...(bag ? { chaosBag: bag } : {}),
    investigators: investigators.map((code) => ({
      code,
      deck: deckCodes(DECK_BY_INV[code] ?? "roland-starter"),
    })),
    ...extra,
  };
  const r = toTurn(skipMulligans(createGame(db, s)));
  return prep ? mutate(r, prep) : r;
}

/** replace the chaos bag mid-game */
export const rigBag = (r: Result, tokens: ChaosToken[]): Result =>
  mutate(r, (g) => {
    g.s.chaosBag = [...tokens];
  });

/** the neutral answer to whatever is pending: pass, close a commit window, else the first option */
export function neutral(r: Result): Result {
  const p = r.state.pending!;
  return pick(
    r,
    p.options.some((o) => o.id === "pass")
      ? "pass"
      : p.kind === "commit" || p.options[0].label.startsWith("Done")
        ? /^Done/
        : /./,
  );
}

const seen = (r: Result) => `${r.state.pending?.kind}: ${r.state.pending?.prompt}`;

/** answer neutrally until `stop` holds (or nothing is pending); throws past `cap` answers with the prompts it saw */
export function until(r: Result, stop: (r: Result) => boolean, cap = CAP): Result {
  const prompts: string[] = [];
  for (let k = 0; r.state.pending && !stop(r); k++) {
    if (k >= cap)
      throw new Error(`until: no stop after ${cap} answers; prompts seen:\n${prompts.join("\n")}`);
    prompts.push(seen(r));
    r = neutral(r);
  }
  return r;
}

/**
 * answer neutrally until somebody has to choose an action: `who` names the investigator (others end their turn), or a
 * predicate stops earlier
 */
export function toTurn(r: Result, who?: InvId | ((r: Result) => boolean)): Result {
  const stop = typeof who === "function" ? who : () => false;
  const prompts: string[] = [];
  for (let k = 0; r.state.pending && !stop(r); k++) {
    const p = r.state.pending;
    if (p.kind === "turn") {
      if (typeof who !== "string" || p.inv === who) return r;
      r = pick(r, "End turn");
      continue;
    }
    if (k >= CAP)
      throw new Error(`toTurn: no turn after ${CAP} answers; prompts seen:\n${prompts.join("\n")}`);
    prompts.push(seen(r));
    r = neutral(r);
  }
  return r;
}

/** the trigger of the open reaction window, or null */
export function windowOf(r: Result): string | null {
  const step = r.state.pending?.step;
  return step?.t === "Window" ? step.trigger : null;
}

/** the event data of the open reaction window (the damage dealt, the enemy defeated...), or null */
export function windowData(r: Result): Record<string, unknown> | null {
  const step = r.state.pending?.step;
  return step?.t === "Window" ? (step.data as Record<string, unknown>) : null;
}

/** the step the pending choice will resume (for tests of the step machinery itself, such as the script adapter) */
export const pendingStep = (r: Result): Step | null => r.state.pending?.step ?? null;

/** answer neutrally until a reaction window on `trigger` is open */
export const untilWindow = (r: Result, trigger: string): Result =>
  until(r, (x) => windowOf(x) === trigger);

/** a stop condition: an option whose label matches is offered */
export const offered = (label: RegExp | string) => (r: Result) =>
  !!r.state.pending?.options.some((o) =>
    typeof label === "string" ? o.label === label : label.test(o.label),
  );

export interface TestResult {
  skill: string;
  base: number;
  total: number;
  difficulty: number;
  success: boolean;
  tokens: ChaosToken[];
}

/** the data of the last skill test's result event, or null */
export function lastTest(r: Result): TestResult | null {
  const e = r.state.log.findLast((x) => x.type === "testResult");
  return e ? (e.data as unknown as TestResult) : null;
}

/** close the commit window if it is open */
const closeCommit = (r: Result) => (r.state.pending?.kind === "commit" ? pick(r, "done") : r);

/** choose the turn action whose value matches, then close the commit window */
function act(r: Result, what: string, match: (a: TurnAction) => boolean): Result {
  const p = r.state.pending;
  if (p?.kind !== "turn")
    throw new Error(`${what}: not at a turn prompt (${p ? seen(r) : "nothing pending"})`);
  const o = p.options.find((x) => match(x.value as TurnAction));
  if (!o) throw new Error(`${what}: not offered in [${p.options.map((x) => x.label).join(" | ")}]`);
  return closeCommit(pick(r, o.id));
}

const codeOf = (r: Result, id: string) => card(gOf(r), id).code;

export const investigate = (r: Result) => act(r, "investigate", (a) => a.kind === "investigate");
export const fight = (r: Result, enemy: string) =>
  act(r, `fight ${enemy}`, (a) => a.kind === "fight" && codeOf(r, a.enemy) === enemy);
export const evade = (r: Result, enemy: string) =>
  act(r, `evade ${enemy}`, (a) => a.kind === "evade" && codeOf(r, a.enemy) === enemy);
export const move = (r: Result, to: string) =>
  act(r, `move to ${to}`, (a) => a.kind === "move" && codeOf(r, a.to) === to);
export const play = (r: Result, code: string) =>
  act(r, `play ${code}`, (a) => a.kind === "play" && codeOf(r, a.card) === code);
export const use = (r: Result, code: string, index = 0) =>
  act(
    r,
    `use ${code}`,
    (a) => a.kind === "ability" && codeOf(r, a.card) === code && a.index === index,
  );

/** change the state, then resolve `steps` (first first) before the choice that was pending is asked again */
export function inject(r: Result, fn: (game: GameContext) => void, ...steps: Step[]): Result {
  const s = structuredClone(r.state);
  const game: GameContext = { s, db, events: [] };
  fn(game);
  if (s.pending) {
    s.queue.push({ ...s.pending.step, choice: undefined });
    s.pending = null;
  }
  s.queue.push(...[...steps].reverse());
  run(game);
  return { state: s, events: game.events };
}

/** queue an engine step from a test's setup (it runs when the pending choice is re-asked): a spawn, damage to assign... */
export const injectStep = (game: GameContext, step: Step) => push(game, step);

/** a card of `code` in the investigator's hand */
export function hand(game: GameContext, i: string, code: string) {
  const id = createCard(game, code, ZONE.Limbo, i);
  moveCard(game, id, ZONE.Hand);
  return id;
}

/** a card of `code` in play under the investigator's control */
export function inPlay(game: GameContext, i: string, code: string) {
  const id = createCard(game, code, ZONE.Limbo, i);
  moveCard(game, id, ZONE.Play);
  setController(game, id, i);
  if (game.db.cards[code].uses) setCounter(game, id, "uses", game.db.cards[code].uses!.count);
  return id;
}

/** an enemy at the investigator's location, engaged with them or not */
export const enemyHere = (game: GameContext, i: string, code = DEFAULT_ENEMY, engaged = true) =>
  putEnemy(game, code, inv(game, i).location!, engaged ? i : null);

/** a revealed, clueless location joined to the map by `pairs` of location codes */
export function addLocation(game: GameContext, code: string, pairs: [string, string][]) {
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  setCounter(game, id, "clues", 0);
  for (const [a, b] of pairs) linkCodes(game, a, b);
  return id;
}

/** link every location in play of one code to every one of another (a test's map) */
export function linkCodes(game: GameContext, a: string, b: string) {
  const of = (code: string) => cardsIn(game, ZONE.Location).filter((l) => l.code === code);
  for (const x of of(a)) for (const y of of(b)) link(game, x.id, y.id);
}

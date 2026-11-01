/**
 * The replay oracle's recordings: a game (a setup and its choices) or a campaign (its start, the flow's answers and each
 * scenario's choices), with what they produced. `pnpm record:games` writes them with the current engine; the replay test
 * plays them again and compares. Pure: no files, no pack loading (the caller loads `packs` first).
 */
import { botChoice } from "../bot";
import {
  applyScenarioEnd,
  type CampaignState,
  type NewCampaign,
  scenarioSetup,
  startCampaign,
} from "../campaign";
import { createGame, dispatch, type Result } from "../engine";
import { advance, type FlowValue, test } from "../flow";
import { next } from "../rng";
import type { Action, ContentDb, GameEvent, GameSetup, GameState } from "../types";

/** who makes the choices: the bot's preferences, seeded random legal choices (wider coverage, rarely an ending), or
 *  each choice the bot's or a random one by a coin (random variety that still advances acts and agendas) */
export type Player = "bot" | "random" | "mixed";

export interface GameRecipe {
  id: string;
  /** the packs to load before playing (core is always loaded) */
  packs: string[];
  setup: GameSetup;
  player: Player;
  /** the most choices one game may take: a game still going stops there */
  maxChoices: number;
}

export interface CampaignRecipe {
  id: string;
  packs: string[];
  start: NewCampaign;
  maxChoices: number;
}

export interface Played {
  state: GameState;
  events: GameEvent[];
}

export type GameRecording = GameRecipe & { kind: "game"; actions: Action[] } & Played;

/** a campaign move: an answer to the flow's prompt, or a scenario played from its Begin prompt with this seed */
export type CampaignMove = { flow: FlowValue } | { play: { seed: number; actions: Action[] } };

export type CampaignRecording = CampaignRecipe & {
  kind: "campaign";
  moves: CampaignMove[];
  campaign: CampaignState;
  games: Played[];
};

export type Recording = GameRecording | CampaignRecording;

/** what a recording produces when played: its games, for a campaign the campaign at the end, and the recorded choice the engine refused (the replay stops there) */
export interface Replayed {
  kind: Recording["kind"];
  games: Played[];
  campaign?: CampaignState;
  error?: string;
}

/** play actions from `r` until nothing is pending, `pick` has none or the cap: a picker's, or the recorded ones */
function play(
  db: ContentDb,
  r: Result,
  pick: (r: Result, k: number) => Action | undefined,
  maxChoices: number,
): Played & { actions: Action[]; error?: string } {
  const events = [...r.events];
  const actions: Action[] = [];
  for (let k = 0; k < maxChoices && r.state.pending; k++) {
    const action = pick(r, k);
    if (!action) break;
    const nextR = dispatch(db, r.state, action);
    if (nextR.error)
      return {
        state: r.state,
        events,
        actions,
        error: `choice ${k} (${action.option}): ${nextR.error}`,
      };
    actions.push(action);
    events.push(...nextR.events);
    r = nextR;
  }
  return { state: r.state, events, actions };
}

/** recording: a choice the engine refuses is a bug in the recipe or the engine, not a result to store */
function strict<T extends { error?: string }>(id: string, p: T): T {
  if (p.error) throw new Error(`${id}: ${p.error}`);
  return p;
}

/** a seeded random legal choice, ending the turn now and then so a game moves on */
function randomPicker(seed: number) {
  const rng = { rng: (seed * 7919) >>> 0 };
  return (r: Result) => {
    const options = r.state.pending!.options;
    const end = options.find((o) => o.label === "End turn");
    return end && next(rng) < 0.3 ? end.id : options[Math.floor(next(rng) * options.length)].id;
  };
}

function picker(db: ContentDb, player: Player, seed: number) {
  const random = randomPicker(seed);
  const coin = { rng: (seed * 104729) >>> 0 };
  const option =
    player === "bot"
      ? (r: Result) => botChoice(db, r)
      : player === "random"
        ? random
        : (r: Result) => (next(coin) < 0.5 ? botChoice(db, r) : random(r));
  return (r: Result): Action => ({ type: "choose", inv: r.state.pending!.inv, option: option(r) });
}

export function recordGame(db: ContentDb, recipe: GameRecipe): GameRecording {
  const { state, events, actions } = strict(
    recipe.id,
    play(
      db,
      createGame(db, recipe.setup),
      picker(db, recipe.player, recipe.setup.seed),
      recipe.maxChoices,
    ),
  );
  return { ...recipe, kind: "game", actions, state, events };
}

/** the bot's answer to the campaign flow's prompt: read on, take the first open choice, the least of a number */
export function botFlowAnswer(db: ContentDb, c: CampaignState): FlowValue {
  const st = c.flow.waiting!.step;
  const first = c.investigators.find((i) => i.status === "active")?.code ?? null;
  switch (st.kind) {
    case "chooseOne":
      return st.choices.find((x) => !x.when || test(db, c, x.when))!.id;
    case "counter":
      return st.min;
    case "investigatorChoice":
      return st.optional ? null : first;
    case "investigator":
      return first;
    case "cardChoice":
      return st.codes.slice(0, st.min);
    case "checklist":
      return st.choices
        .filter((x) => !x.when || test(db, c, x.when))
        .slice(0, st.min)
        .map((x) => x.id);
    case "sideScenario":
      return null;
    default:
      return "continue";
  }
}

/** the seed a campaign's nth scenario is played with */
const scenarioSeed = (start: NewCampaign, n: number) => (start.seed * 101 + n * 7) >>> 0;

const MAX_MOVES = 400;

export function recordCampaign(db: ContentDb, recipe: CampaignRecipe): CampaignRecording {
  let c = startCampaign(db, recipe.start);
  const moves: CampaignMove[] = [];
  const games: Played[] = [];
  for (let k = 0; c.flow.waiting && k < MAX_MOVES; k++) {
    if (c.flow.waiting.step.kind === "play") {
      c = advance(db, c, "continue");
      const seed = scenarioSeed(recipe.start, games.length);
      const p = strict(
        recipe.id,
        play(
          db,
          createGame(db, scenarioSetup(db, c, seed)),
          picker(db, "bot", seed),
          recipe.maxChoices,
        ),
      );
      if (p.state.phase !== "ended")
        throw new Error(`${recipe.id}: ${c.flow.play} did not end in ${recipe.maxChoices} choices`);
      c = applyScenarioEnd(db, c, p.state);
      moves.push({ play: { seed, actions: p.actions } });
      games.push({ state: p.state, events: p.events });
    } else {
      const value = botFlowAnswer(db, c);
      c = advance(db, c, value);
      moves.push({ flow: value });
    }
  }
  return { ...recipe, kind: "campaign", moves, campaign: c, games };
}

/** play a recording's choices again on the current engine */
export function replayRecording(db: ContentDb, rec: Recording): Replayed {
  if (rec.kind === "game") {
    const p = play(db, createGame(db, rec.setup), (_r, k) => rec.actions[k], Infinity);
    return {
      kind: "game",
      games: [{ state: p.state, events: p.events }],
      ...(p.error ? { error: p.error } : {}),
    };
  }
  let c = startCampaign(db, rec.start);
  const games: Played[] = [];
  for (const move of rec.moves) {
    if ("flow" in move) {
      c = advance(db, c, move.flow);
      continue;
    }
    c = advance(db, c, "continue");
    const p = play(
      db,
      createGame(db, scenarioSetup(db, c, move.play.seed)),
      (_r, k) => move.play.actions[k],
      Infinity,
    );
    games.push({ state: p.state, events: p.events });
    if (p.error)
      return {
        kind: "campaign",
        games,
        campaign: c,
        error: `game ${games.length - 1}: ${p.error}`,
      };
    c = applyScenarioEnd(db, c, p.state);
  }
  return { kind: "campaign", games, campaign: c };
}

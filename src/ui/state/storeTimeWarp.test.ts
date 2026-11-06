/**
 * Time Warp (03311) through the store (player-cards-ptc, design decision 5): the choice that plays it rebuilds the game
 * from the list of choices, as Undo does; a save holding it loads to the same game; the Undo button's floor is unchanged.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { createGame, dispatch, replay } from "../../engine";
import { db } from "../../engine/kits/testkit";
import type { Action, GameSetup } from "../../engine/world/types";
import { canUndo, createGameStore, replayWithFloor, type Storage } from "./store";

beforeAll(() => loadPack("ptc"));

const mem = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const setup: GameSetup = {
  campaignId: "night-of-the-zealot",
  scenarioId: "the-gathering",
  difficulty: "standard",
  seed: 5,
  chaosBag: ["+1", "0", "-1", "-2", "-3", "-4", "-5", "-6", "-7", "-8"],
  investigators: [{ code: "01001", deck: Array<string>(30).fill("03311") }],
};

/** Roland keeps his hand and investigates: the choices up to the window that offers Time Warp, and its option */
function upToWarp(): { actions: Action[]; warp: string } {
  const actions: Action[] = [];
  let state = createGame(db, setup).state;
  const choose = (id: string) => {
    const a: Action = { type: "choose", inv: state.pending!.inv, option: id };
    actions.push(a);
    state = dispatch(db, state, a).state;
  };
  while (state.pending?.kind !== "turn") choose(state.pending!.options[0].id);
  choose(
    state.pending.options.find((o) => (o.value as { kind?: string }).kind === "investigate")!.id,
  );
  const warp = state.pending!.options.find((o) => o.label === "Time Warp (play)")!.id;
  return { actions, warp };
}

describe("Time Warp through the store", () => {
  it("a saved game holding the Time Warp choice loads to the game the engine replays", () => {
    const { actions, warp } = upToWarp();
    const all = [...actions, { type: "choose", inv: "01001", option: warp } as Action];
    const s = createGameStore(db, mem());
    s.getState().importLog(JSON.stringify({ setup, actions: all }));
    const game = s.getState().game!;
    expect(game).toEqual(replay(db, setup, all).state);
    expect(game).toEqual(replayWithFloor(db, setup, all).state);
    expect(game.pending?.kind).toBe("turn");
    expect(game.rewind).toBeUndefined();
  });

  it("playing it rebuilds the game; the Undo floor is unchanged, and Undo takes back the Time Warp", () => {
    const { actions, warp } = upToWarp();
    const s = createGameStore(db, mem());
    s.getState().importLog(JSON.stringify({ setup, actions }));
    const floor = s.getState().undoFloor;
    s.getState().choose(warp);
    const all = s.getState().actions;
    expect(all).toHaveLength(actions.length + 1);
    expect(s.getState().game).toEqual(replay(db, setup, all).state);
    expect(s.getState().undoFloor).toBe(floor);
    expect(canUndo(s.getState())).toBe(true);
    s.getState().undo();
    expect(s.getState().game).toEqual(replay(db, setup, actions).state);
  });
});

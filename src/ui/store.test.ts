import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { createGameStore, SAVE_KEY, type Storage } from "./store";

const mem = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

const start = (storage: Storage) => {
  const s = createGameStore(db, storage);
  s.getState().newCampaign({ campaignId: "night-of-the-zealot", difficulty: "standard", seed: 9, investigators: [{ code: "01001", deckId: "roland-starter" }] });
  return s;
};

describe("ui store", () => {
  it("dispatch through the store updates the game state", () => {
    const s = start(mem());
    expect(s.getState().screen).toBe("game");
    while (s.getState().game!.pending!.kind === "mulligan") s.getState().choose("done");
    s.getState().skipEvents();
    const res = s.getState().game!.invs["01001"].resources;
    s.getState().choose(JSON.stringify({ kind: "resource" }));
    expect(s.getState().game!.invs["01001"].resources).toBe(res + 1);
  });

  it("blocks input while events are animating", () => {
    const s = start(mem());
    while (s.getState().game!.pending!.kind === "mulligan") s.getState().choose("done");
    s.getState().skipEvents();
    s.getState().choose(JSON.stringify({ kind: "investigate" }));
    if (s.getState().game!.pending!.kind === "commit") s.getState().choose("done"); // token + result events queue up
    const before = s.getState().actions.length;
    expect(s.getState().current).not.toBeNull();
    s.getState().choose(s.getState().game!.pending!.options[0].id);
    expect(s.getState().actions.length).toBe(before);
  });

  it("reload mid-scenario resumes the identical state", () => {
    const storage = mem();
    const s = start(storage);
    while (s.getState().game!.pending!.kind === "mulligan") s.getState().choose("done");
    s.getState().skipEvents();
    s.getState().choose(JSON.stringify({ kind: "draw" }));
    s.getState().skipEvents();
    const reloaded = createGameStore(db, storage);
    expect(reloaded.getState().resume()).toBe(true);
    expect(reloaded.getState().game).toEqual(s.getState().game);
    expect(reloaded.getState().screen).toBe("game");
  });

  it("a save from another engine version keeps the campaign and restarts the scenario", () => {
    const storage = mem();
    start(storage);
    const save = JSON.parse(storage.data.get(SAVE_KEY)!);
    save.version = -1;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    const s = createGameStore(db, storage);
    s.getState().resume();
    expect(s.getState().screen).toBe("log");
    expect(s.getState().campaign).not.toBeNull();
    expect(s.getState().notice).toMatch(/restart/);
  });
});

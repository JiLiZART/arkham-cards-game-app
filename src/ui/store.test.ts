import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { canUndo, createGameStore, SAVE_KEY, type Storage } from "./store";

const mem = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

const start = (storage: Storage) => {
  const s = createGameStore(db, storage);
  s.getState().newCampaign({ campaignId: "night-of-the-zealot", difficulty: "standard", seed: 9, investigators: [{ code: "01001", deckId: "roland-starter" }] });
  return s;
};

/** past the mulligan and the pause before the first phase */
const begin = (s: ReturnType<typeof start>) => {
  while (s.getState().game!.pending!.kind === "mulligan") s.getState().choose("done");
  expect(s.getState().game!.pending!.kind).toBe("phase");
  s.getState().choose("continue");
};

describe("ui store", () => {
  it("dispatch through the store updates the game state", () => {
    const s = start(mem());
    expect(s.getState().screen).toBe("game");
    begin(s);
    s.getState().skipEvents();
    const res = s.getState().game!.invs["01001"].resources;
    s.getState().choose(JSON.stringify({ kind: "resource" }));
    expect(s.getState().game!.invs["01001"].resources).toBe(res + 1);
  });

  it("blocks input while events are animating", () => {
    const s = start(mem());
    begin(s);
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
    begin(s);
    s.getState().skipEvents();
    s.getState().choose(JSON.stringify({ kind: "draw" }));
    s.getState().skipEvents();
    const reloaded = createGameStore(db, storage);
    expect(reloaded.getState().resume()).toBe(true);
    expect(reloaded.getState().game).toEqual(s.getState().game);
    expect(reloaded.getState().screen).toBe("game");
  });

  it("the pace is saved with the settings; old saves play at the normal pace", () => {
    const storage = mem();
    const s = start(storage);
    expect(s.getState().pace).toBe("normal");
    s.getState().setPace("tap");
    const reloaded = createGameStore(db, storage);
    reloaded.getState().resume();
    expect(reloaded.getState().pace).toBe("tap");
    // a save written before the setting existed
    const save = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete save.settings.pace;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    const old = createGameStore(db, storage);
    old.getState().resume();
    expect(old.getState().pace).toBe("normal");
  });

  it("tips are on by default, saved with the settings, and on for old saves", () => {
    const storage = mem();
    const s = start(storage);
    expect(s.getState().tipsOn).toBe(true);
    s.getState().setTipsOn(false);
    const reloaded = createGameStore(db, storage);
    reloaded.getState().resume();
    expect(reloaded.getState().tipsOn).toBe(false);
    const save = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete save.settings.tipsOn;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    const old = createGameStore(db, storage);
    old.getState().resume();
    expect(old.getState().tipsOn).toBe(true);
  });

  it("volumes and mute are saved with the settings; old saves get the defaults", () => {
    const storage = mem();
    const s = start(storage);
    expect([s.getState().musicVolume, s.getState().sfxVolume, s.getState().muted]).toEqual([50, 80, false]);
    s.getState().setVolume("music", 20);
    s.getState().setVolume("effects", 100);
    s.getState().setMuted(true);
    const reloaded = createGameStore(db, storage);
    reloaded.getState().resume();
    expect([reloaded.getState().musicVolume, reloaded.getState().sfxVolume, reloaded.getState().muted]).toEqual([20, 100, true]);
    const save = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete save.settings.musicVolume;
    delete save.settings.sfxVolume;
    delete save.settings.muted;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    const old = createGameStore(db, storage);
    old.getState().resume();
    expect([old.getState().musicVolume, old.getState().sfxVolume, old.getState().muted]).toEqual([50, 80, false]);
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

describe("undo", () => {
  it("takes back a commit, then the action; never past the token draw", () => {
    const s = start(mem());
    begin(s);
    s.getState().skipEvents();
    const g0 = s.getState().game!;
    const n0 = s.getState().actions.length;
    s.getState().choose(JSON.stringify({ kind: "investigate" }));
    const commit = s.getState().game!.pending!.options.find((o) => /^Commit/.test(o.label))!;
    s.getState().choose(commit.id);
    expect(canUndo(s.getState())).toBe(true);
    s.getState().undo();
    expect(s.getState().game!.invs["01001"].hand).toContain(commit.card);
    expect(s.getState().game!.pending!.kind).toBe("commit");
    s.getState().undo();
    expect(s.getState().game).toEqual(g0);
    expect(s.getState().actions.length).toBe(n0);
    // the phase Continue revealed nothing, so it can still be taken back; the token draw can't
    expect(canUndo(s.getState())).toBe(true);
    s.getState().choose(JSON.stringify({ kind: "investigate" }));
    s.getState().choose("done");
    expect(canUndo(s.getState())).toBe(false);
    const n = s.getState().actions.length;
    s.getState().undo();
    expect(s.getState().actions.length).toBe(n);
  });

  it("a reload keeps the floor", () => {
    const storage = mem();
    const s = start(storage);
    begin(s);
    s.getState().skipEvents();
    s.getState().choose(JSON.stringify({ kind: "draw" }));
    s.getState().skipEvents();
    const reloaded = createGameStore(db, storage);
    reloaded.getState().resume();
    expect(reloaded.getState().undoFloor).toBe(s.getState().undoFloor);
    expect(canUndo(reloaded.getState())).toBe(false);
  });
});

describe("log marks", () => {
  it("mark where each choice's log entries begin; an undo drops the marks of what it took back", () => {
    const s = start(mem());
    begin(s);
    s.getState().skipEvents();
    const n0 = s.getState().game!.log.length;
    s.getState().choose(JSON.stringify({ kind: "resource" }));
    const n1 = s.getState().game!.log.length;
    s.getState().choose(JSON.stringify({ kind: "resource" }));
    expect(s.getState().logMarks.slice(-2)).toEqual([n0, n1]);
    s.getState().skipEvents();
    s.getState().undo();
    expect(s.getState().logMarks.at(-1)).toBe(n0);
  });
});

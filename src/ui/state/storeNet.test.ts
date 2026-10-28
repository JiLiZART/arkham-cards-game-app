import { describe, expect, it } from "vitest";
import { botChoice } from "../../engine/bot";
import { db } from "../../engine/testkit";
import type { NewCampaign } from "../../engine/campaign";
import type { Move, Numbered, RoomSave } from "../../net/moves";
import {
  canUndoHere,
  createGameStore,
  SAVE_KEY,
  type Prepare,
  type Save,
  type Storage,
} from "./store";

const mem = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const opts: NewCampaign = {
  campaignId: "night-of-the-zealot",
  difficulty: "standard",
  seed: 9,
  investigators: [{ code: "01001", deckId: "roland-starter" }],
};

type Store = ReturnType<typeof createGameStore>;

/** the engine choices of a game played by the bot, as moves */
const play = (s: Store, steps: number): Move[] => {
  const moves: Move[] = [];
  for (let k = 0; k < steps; k++) {
    const g = s.getState().game!;
    if (!g.pending) break;
    s.getState().skipEvents();
    const option = botChoice(db, { state: g, events: [] });
    moves.push({ t: "choose", inv: g.pending.inv, option });
    s.getState().choose(option);
  }
  return moves;
};

const solo = (storage: Storage = mem(), prepare?: Prepare) => {
  const s = createGameStore(db, storage, prepare);
  s.getState().setTapDecks(true);
  return s;
};

describe("applyMove", () => {
  it("rebuilds the same campaign, setup and choices as playing them directly", async () => {
    const a = solo();
    a.getState().newCampaign(opts);
    const moves = play(a, 40);
    expect(moves.length).toBeGreaterThan(10);

    const b = solo();
    expect(await b.getState().applyMove({ t: "new", opts })).toBeNull();
    for (const m of moves) expect(await b.getState().applyMove(m)).toBeNull();

    expect(b.getState().campaign).toEqual(a.getState().campaign);
    expect(b.getState().setup).toEqual(a.getState().setup);
    expect(b.getState().actions).toEqual(a.getState().actions);
    expect(b.getState().game).toEqual(a.getState().game);
  });

  it("starts the scenario with the seed of the move", async () => {
    const a = solo();
    await a.getState().applyMove({ t: "new", opts: { ...opts, seed: 11 } });
    const b = solo();
    await b.getState().applyMove({ t: "new", opts: { ...opts, seed: 11 } });
    expect(a.getState().setup).toEqual(b.getState().setup);
    expect(a.getState().setup!.seed).toBe(11);
  });

  it("takes back the last choice, like Undo", async () => {
    const a = solo();
    await a.getState().applyMove({ t: "new", opts });
    // the mulligan is beyond Undo; the first choice after it can be taken back
    const g = a.getState().game!;
    expect(g.pending!.kind).toBe("mulligan");
    await a.getState().applyMove({ t: "choose", inv: g.pending!.inv, option: "done" });
    const floor = a.getState().actions.length;
    expect(floor).toBeGreaterThan(0);
    const p = a.getState().game!.pending!;
    await a.getState().applyMove({ t: "choose", inv: p.inv, option: p.options[0].id });
    expect(a.getState().actions).toHaveLength(floor + 1);
    expect(await a.getState().applyMove({ t: "undo" })).toBeNull();
    expect(a.getState().actions).toHaveLength(floor);
  });

  it("refuses a choice for an investigator who is not deciding, and changes nothing", async () => {
    const a = solo();
    await a.getState().applyMove({ t: "new", opts });
    const before = a.getState().actions;
    const err = await a.getState().applyMove({ t: "choose", inv: "01002", option: "done" });
    expect(err).toEqual(expect.any(String));
    expect(a.getState().actions).toBe(before);
  });

  it("restores a saved campaign from a load move without touching this device's settings", async () => {
    const a = solo();
    a.getState().newCampaign(opts);
    play(a, 12);
    const save = JSON.parse(a.getState().exportLog()) as Pick<
      Save,
      "setup" | "actions" | "campaign"
    >;

    const b = solo();
    b.getState().setLocale("ru");
    const full: Save = {
      version: JSON.parse(a.getState().exportLog()).version,
      ...save,
      settings: { locale: "en", pace: "slow" },
    };
    expect(await b.getState().applyMove({ t: "load", save: full })).toBeNull();
    expect(b.getState().actions).toEqual(a.getState().actions);
    expect(b.getState().game).toEqual(a.getState().game);
    expect(b.getState().locale).toBe("ru");
    expect(b.getState().pace).toBe("normal");
  });

  it("waits for a campaign's packs before it starts", async () => {
    let release = () => {};
    const prepare: Prepare = () => new Promise<void>((r) => (release = r));
    const s = solo(mem(), prepare);
    const done = s.getState().applyMove({ t: "new", opts });
    expect(s.getState().loading).toBe(true);
    expect(s.getState().campaign).toBeNull();
    release();
    expect(await done).toBeNull();
    expect(s.getState().campaign).not.toBeNull();
  });
});

describe("in a room", () => {
  const room = (n: number, moves: Numbered[] = []): RoomSave => ({
    id: "r",
    playerKey: "k",
    me: "ana",
    seats: ["01001"],
    n,
    moves,
  });

  it("sends the player's choice instead of making it", async () => {
    const s = solo();
    await s.getState().applyMove({ t: "new", opts });
    const sent: Move[] = [];
    s.getState().setNet({ propose: (m) => void sent.push(m) });
    const g = s.getState().game!;
    const before = s.getState().actions;
    s.getState().choose("done");
    expect(sent).toEqual([{ t: "choose", inv: g.pending!.inv, option: "done" }]);
    expect(s.getState().actions).toBe(before);
  });

  it("sends the campaign calls too, and changes nothing until they come back", () => {
    const s = solo();
    const sent: Move[] = [];
    s.getState().setNet({ propose: (m) => void sent.push(m) });
    s.getState().newCampaign(opts);
    expect(sent).toEqual([{ t: "new", opts }]);
    expect(s.getState().campaign).toBeNull();
  });

  it("sends Undo only when it could be taken back", async () => {
    const s = solo();
    await s.getState().applyMove({ t: "new", opts });
    const sent: Move[] = [];
    s.getState().setNet({ propose: (m) => void sent.push(m) });
    s.getState().undo();
    expect(sent).toEqual([]);
  });

  it("does not answer draw prompts by itself while Tap decks is off", async () => {
    const s = createGameStore(db, mem());
    s.getState().setTapDecks(false);
    s.getState().setNet({ propose: () => {} });
    await s.getState().applyMove({ t: "new", opts });
    const g = s.getState().game!;
    await s.getState().applyMove({ t: "choose", inv: g.pending!.inv, option: "done" });
    // whatever the mulligan led to, no choice was added that the move did not name
    expect(s.getState().actions.filter((a) => a.option === "draw")).toHaveLength(0);
  });

  it("saves the room with the state it belongs to, in one write", async () => {
    const storage = mem();
    const s = solo(storage);
    await s.getState().applyMove({ t: "new", opts }, room(1));
    const saved = JSON.parse(storage.data.get(SAVE_KEY)!) as Save;
    expect(saved.room).toEqual(room(1));
    expect(saved.campaign).toBeTruthy();
  });

  it("restores the room from the save", async () => {
    const storage = mem();
    const a = solo(storage);
    await a.getState().applyMove({ t: "new", opts }, room(1));
    const b = solo(storage);
    expect(b.getState().resume()).toBe(true);
    expect(b.getState().room).toEqual(room(1));
  });

  it("loads an older save that has no room", () => {
    const storage = mem();
    const a = solo(storage);
    a.getState().newCampaign(opts);
    const b = solo(storage);
    expect(b.getState().resume()).toBe(true);
    expect(b.getState().room).toBeNull();
  });
});

describe("canUndoHere", () => {
  const withLast = async (by: string, move: Move) => {
    const s = solo();
    await s.getState().applyMove({ t: "new", opts });
    const g = s.getState().game!;
    await s.getState().applyMove({ t: "choose", inv: g.pending!.inv, option: "done" });
    const p = s.getState().game!.pending!;
    await s.getState().applyMove({ t: "choose", inv: p.inv, option: p.options[0].id });
    s.getState().setRoom({
      id: "r",
      playerKey: "k",
      me: "ana",
      seats: ["01001"],
      n: 1,
      moves: [{ n: 0, by, move }],
    });
    return s;
  };
  const pick: Move = { t: "choose", inv: "01001", option: "x" };

  it("is Undo's own rule without a room", async () => {
    const s = solo();
    await s.getState().applyMove({ t: "new", opts });
    expect(canUndoHere(s.getState())).toBe(canUndoHere({ ...s.getState(), room: null }));
  });

  it("is for the player who made the last move", async () => {
    const mine = await withLast("ana", pick);
    expect(canUndoHere(mine.getState())).toBe(true);
    const theirs = await withLast("ben", pick);
    expect(canUndoHere(theirs.getState())).toBe(false);
  });

  it("is not for a last move that was not a choice", async () => {
    const s = await withLast("ana", { t: "flow", value: "continue" });
    expect(canUndoHere(s.getState())).toBe(false);
  });

  it("does not send an Undo that is not this player's", async () => {
    const s = await withLast("ben", pick);
    const sent: Move[] = [];
    s.getState().setNet({ propose: (m) => void sent.push(m) });
    s.getState().undo();
    expect(sent).toEqual([]);
  });

  it("sends an Undo that is", async () => {
    const s = await withLast("ana", pick);
    const sent: Move[] = [];
    s.getState().setNet({ propose: (m) => void sent.push(m) });
    s.getState().undo();
    expect(sent).toEqual([{ t: "undo" }]);
  });
});

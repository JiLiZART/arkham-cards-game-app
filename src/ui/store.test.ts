import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { scenarioSetup } from "../engine/campaign";
import { ENGINE_VERSION } from "../engine/engine";
import { ANIMATED, canUndo, createGameStore, HELD, heldCards, holdsForTap, needsNext, SAVE_KEY, type Storage } from "./store";

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

describe("pace and held events", () => {
  const ev = (type: string) => ({ type, text: type, inv: null, card: null, data: {} });

  it("a drawn encounter card or weakness is held at every pace, with no caption Next (the showcase has its own)", () => {
    for (const type of ["encounter", "weakness"]) {
      expect(HELD.has(type), type).toBe(true);
      expect(ANIMATED.has(type), type).toBe(true);
      for (const pace of ["normal", "slow", "tap"] as const) expect(needsNext(ev(type), pace, false), `${type} ${pace}`).toBe(false);
    }
  });

  it("the cards still waiting in (or for) the showcase: the playing one and the queued ones", () => {
    const e = (type: string, card: string | null) => ({ type, text: type, inv: null, card, data: {}, logIndex: 0 });
    expect([...heldCards({ current: e("encounter", "c1"), queue: [e("damage", "c9"), e("weakness", "c2"), e("encounter", null)] })]).toEqual(["c1", "c2"]);
    expect(heldCards({ current: null, queue: [] }).size).toBe(0);
  });

  it("other big events still wait for Next only at the Tap pace", () => {
    expect(needsNext(ev("attack"), "tap", false)).toBe(true);
    expect(needsNext(ev("attack"), "normal", false)).toBe(false);
    expect(holdsForTap(ev("attack"), "slow")).toBe(false);
  });
});

describe("the tap decks setting", () => {
  it("is on by default and a new scenario's setup asks for tapped decks", () => {
    const s = start(mem());
    expect(s.getState().tapDecks).toBe(true);
    expect(s.getState().setup?.tapDecks).toBe(true);
    expect(s.getState().game?.tapDecks).toBe(true);
  });

  it("off: the setup doesn't ask, and the draws happen without waiting", () => {
    const s = createGameStore(db, mem());
    s.getState().setTapDecks(false);
    s.getState().newCampaign({ campaignId: "night-of-the-zealot", difficulty: "standard", seed: 9, investigators: [{ code: "01001", deckId: "roland-starter" }] });
    expect(s.getState().setup?.tapDecks).toBeUndefined();
    expect(s.getState().game?.tapDecks).toBeUndefined();
  });

  it("is saved with the other settings, and a save from before it reads as on", () => {
    const storage = mem();
    const a = start(storage);
    a.getState().setTapDecks(false);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).settings.tapDecks).toBe(false);
    const b = createGameStore(db, storage);
    b.getState().resume();
    expect(b.getState().tapDecks).toBe(false);
    const raw = JSON.parse(storage.getItem(SAVE_KEY)!);
    delete raw.settings.tapDecks;
    storage.setItem(SAVE_KEY, JSON.stringify(raw));
    const c = createGameStore(db, storage);
    c.getState().resume();
    expect(c.getState().tapDecks).toBe(true);
  });
});

describe("saves from before the pass screen went", () => {
  it("a save with settings.privacy loads, and the setting is gone from the state and from the next save", () => {
    const storage = mem();
    const first = start(storage);
    begin(first);
    const raw = JSON.parse(storage.getItem(SAVE_KEY)!);
    raw.settings.privacy = true;
    storage.setItem(SAVE_KEY, JSON.stringify(raw));
    const again = createGameStore(db, storage);
    expect(again.getState().resume()).toBe(true);
    expect(again.getState().game).toEqual(first.getState().game);
    expect("privacy" in again.getState()).toBe(false);
    again.getState().setPace("slow");
    expect("privacy" in JSON.parse(storage.getItem(SAVE_KEY)!).settings).toBe(false);
  });
});

describe("game report", () => {
  it("holds the replay log, the campaign, the settings, the view and the pending prompt, and the build", () => {
    const s = start(mem());
    begin(s);
    s.getState().skipEvents();
    s.getState().setPace("slow");
    s.getState().setDrawByHand(false);
    const r = JSON.parse(s.getState().exportReport());
    const g = s.getState().game!;
    expect(r.version).toBe(ENGINE_VERSION);
    expect(typeof r.app).toBe("string");
    expect(r.setup).toEqual(s.getState().setup);
    expect(r.actions).toEqual(s.getState().actions);
    expect(r.campaign.campaignId).toBe("night-of-the-zealot");
    expect(r.settings).toEqual({ locale: "en", drawByHand: false, pace: "slow" });
    expect(r.view).toEqual({ viewing: null });
    expect(r.pending).toEqual({ inv: g.pending!.inv, kind: g.pending!.kind, prompt: g.pending!.prompt });
    expect(r.where).toEqual({ scenario: g.scenarioId, round: g.round, phase: g.phase });
  });

  it("a pasted report gives the same table in a fresh store: game, settings, campaign, pending", () => {
    const a = start(mem());
    begin(a);
    a.getState().skipEvents();
    a.getState().choose(JSON.stringify({ kind: "draw" }));
    a.getState().skipEvents();
    a.getState().setPace("tap");
    const report = a.getState().exportReport();
    const b = createGameStore(db, mem());
    b.getState().importReport(report);
    expect(b.getState().game).toEqual(a.getState().game);
    expect(b.getState().actions).toEqual(a.getState().actions);
    expect(b.getState().campaign).toEqual(a.getState().campaign);
    expect(b.getState().screen).toBe("game");
    expect(b.getState().pace).toBe("tap");
    expect(b.getState().game!.pending).toEqual(a.getState().game!.pending);
  });

  it("a plain action log still loads as a report, with the settings left alone", () => {
    const a = start(mem());
    begin(a);
    const b = createGameStore(db, mem());
    b.getState().setPace("slow");
    b.getState().importReport(a.getState().exportLog());
    expect(b.getState().game).toEqual(a.getState().game);
    expect(b.getState().pace).toBe("slow");
  });

  it("text that isn't a report is refused in plain words", () => {
    const b = createGameStore(db, mem());
    expect(() => b.getState().importReport("{nope")).toThrow(/not valid JSON/i);
    expect(() => b.getState().importReport(JSON.stringify({ hello: 1 }))).toThrow(/not a game report/i);
    expect(b.getState().game).toBeNull();
  });
});

describe("spending experience on the campaign's deck", () => {
  const swap = () => {
    // Flashlight (two copies) out, two copies of another level 0 card in: 2 experience
    const cards = { ...db.decks["roland-starter"].cards };
    delete cards["01087"];
    const other = Object.values(db.cards).find((c) => ["guardian", "seeker", "neutral"].includes(c.faction) && ["asset", "event", "skill"].includes(c.type) && (c.xp ?? 0) === 0 && !cards[c.code] && !c.subtype && (c.deckLimit ?? 2) >= 2 && !Object.keys(db.decks["roland-starter"].cards).some((k) => db.cards[k].name === c.name) && !c.encounterSet)!;
    cards[other.code] = 2;
    return { cards, other: other.code };
  };

  it("takes the experience, keeps the new deck in the campaign and saves it; the next scenario uses it", () => {
    const storage = mem();
    const s = start(storage);
    s.setState({ campaign: { ...s.getState().campaign!, investigators: [{ ...s.getState().campaign!.investigators[0], xp: 5 }] } });
    const { cards, other } = swap();
    const r = s.getState().upgradeDeck("01001", cards);
    expect(r).toMatchObject({ ok: true, cost: 2 });
    const inv = s.getState().campaign!.investigators[0];
    expect(inv.xp).toBe(3);
    expect(inv.deck).toContain(other);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).campaign.investigators[0].deck).toContain(other);
    expect(scenarioSetup(db, s.getState().campaign!, 1).investigators[0].deck).toContain(other);
  });

  it("refuses what the experience can't pay and leaves the campaign alone", () => {
    const s = start(mem());
    const before = structuredClone(s.getState().campaign);
    const r = s.getState().upgradeDeck("01001", swap().cards);
    expect(r).toEqual({ ok: false, reason: { key: "upgrade.cost", vars: { need: 2, have: 0 } } });
    expect(s.getState().campaign).toEqual(before);
  });
});

describe("campaigns whose cards load first", () => {
  /** a prepare step that holds until released, like loading a pack */
  const gate = () => {
    let release!: () => void;
    let fail!: (e: Error) => void;
    const asked: string[] = [];
    const prepare = (id: string) => {
      asked.push(id);
      return new Promise<void>((res, rej) => {
        release = res;
        fail = rej;
      });
    };
    return { prepare, asked, release: () => release(), fail: (e: Error) => fail(e) };
  };
  const opts = { campaignId: "night-of-the-zealot", difficulty: "standard" as const, seed: 9, investigators: [{ code: "01001", deckId: "roland-starter" }] };

  it("a new campaign starts once its cards are loaded, and says it is loading meanwhile", async () => {
    const g = gate();
    const s = createGameStore(db, mem(), g.prepare);
    s.getState().newCampaign(opts);
    expect(g.asked).toEqual(["night-of-the-zealot"]);
    expect(s.getState()).toMatchObject({ loading: true, game: null });
    g.release();
    await Promise.resolve();
    await Promise.resolve();
    expect(s.getState().loading).toBe(false);
    expect(s.getState().game?.pending?.kind).toBe("mulligan");
  });

  it("a load that fails leaves no half-started game and says why", async () => {
    const g = gate();
    const s = createGameStore(db, mem(), g.prepare);
    s.getState().newCampaign(opts);
    g.fail(new Error("unknown pack dwl"));
    await Promise.resolve();
    await Promise.resolve();
    expect(s.getState()).toMatchObject({ loading: false, game: null, campaign: null });
    expect(s.getState().error).toMatch(/unknown pack dwl/);
  });

  it("a saved game is restored once its campaign's cards are loaded", async () => {
    const storage = mem();
    const first = start(storage);
    begin(first);
    first.getState().skipEvents();
    const g = gate();
    const reloaded = createGameStore(db, storage, g.prepare);
    expect(reloaded.getState().resume()).toBe(true);
    expect(reloaded.getState().game).toBeNull();
    g.release();
    await Promise.resolve();
    await Promise.resolve();
    expect(reloaded.getState().game).toEqual(first.getState().game);
  });

  it("prepare is told the investigators and every card of their decks, so their packs load too", () => {
    const seen: (string[] | undefined)[] = [];
    const s = createGameStore(db, mem(), (_id, codes) => void seen.push(codes));
    s.getState().newCampaign(opts);
    expect(seen[0]).toContain("01001");
    expect(seen[0]).toContain("01086");
    expect(seen[0]).toHaveLength(new Set(seen[0]).size);
    // a custom deck is read from the deck itself
    const custom = { ...db.decks["roland-starter"], id: "mine", cards: { "01006": 1, "01007": 1, "99999": 1 } };
    // (the deck is not a legal one, so the start itself is refused: only what prepare was asked matters here)
    expect(() => s.getState().newCampaign({ ...opts, investigators: [{ code: "01001", deckId: "mine", deck: custom }] })).toThrow();
    expect(seen[1]).toContain("99999");
  });

  it("a saved game's cards are asked for again when it is restored", () => {
    const storage = mem();
    const first = start(storage);
    begin(first);
    const seen: (string[] | undefined)[] = [];
    createGameStore(db, storage, (_id, codes) => void seen.push(codes)).getState().resume();
    expect(seen[0]).toContain("01001");
    expect(seen[0]).toContain("01086");
  });

  it("with nothing to load the campaign starts at once, as before", () => {
    const s = createGameStore(db, mem(), () => undefined);
    s.getState().newCampaign(opts);
    expect(s.getState().game).not.toBeNull();
  });
});

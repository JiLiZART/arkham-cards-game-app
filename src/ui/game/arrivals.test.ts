import { describe, expect, it } from "vitest";
import { db, giveCard, mutate, pick, skipMulligans, start } from "../../engine/testkit";
import { createStore } from "zustand/vanilla";
import {
  diffArrivals,
  originRect,
  quietNextGame,
  takeArrival,
  trackArrivals,
  type Arrival,
  type Place,
  isSettled,
} from "./arrivals";
import type { UiState } from "../state/store";

describe("diffArrivals", () => {
  const base = skipMulligans(start("the-gathering", ["01001"], 1));

  it("a draw: deck → hand, owned by the drawer", () => {
    const r = pick(base, /^Draw/);
    const a = diffArrivals(base.state, r.state);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      from: "deck",
      to: "hand",
      owner: "01001",
      opening: false,
      batch: 0,
    });
  });

  it("playing an asset: hand → play", () => {
    let id = "";
    const r0 = mutate(base, (g) => {
      id = giveCard(g, "01001", "01020");
    });
    const r = pick(r0, /^Play Machete/);
    expect(diffArrivals(r0.state, r.state)).toContainEqual(
      expect.objectContaining({ id, from: "hand", to: "play", owner: "01001" }),
    );
  });

  it("a spawn: encounter deck → enemy; staggered batch indexes", () => {
    const ids: string[] = [];
    const r = mutate(base, (g) => {
      const enc = Object.values(g.s.cards)
        .filter((c) => c.zone === "encounterDeck" && db.cards[c.code].type === "enemy")
        .slice(0, 2);
      for (const c of enc) {
        c.zone = "enemy";
        c.location = g.s.invs["01001"].location;
        ids.push(c.id);
      }
    });
    const a = diffArrivals(base.state, r.state).filter((x) => ids.includes(x.id));
    expect(a.map((x) => [x.from, x.to, x.batch])).toEqual([
      ["encounterDeck", "enemy", 0],
      ["encounterDeck", "enemy", 1],
    ]);
  });

  it("a drawn weakness was shown in the showcase: it arrives from there", () => {
    const r0 = mutate(base, (g) => {
      const cover = Object.values(g.s.cards).find((c) => c.code === "01007")!;
      const me = g.s.invs["01001"];
      for (const z of ["deck", "hand", "discard"] as const)
        me[z] = me[z].filter((x) => x !== cover.id);
      me.deck.unshift(cover.id);
      cover.zone = "deck";
    });
    const r = pick(r0, /^Draw/);
    const a = diffArrivals(r0.state, r.state).find((x) => r.state.cards[x.id].code === "01007");
    expect(a).toMatchObject({ from: "deck", to: "threat", shown: true });
  });

  it("a new scenario: the opening hand comes from the deck, flagged as opening", () => {
    const s = start("the-gathering", ["01001"], 1).state;
    const a = diffArrivals(null, s);
    expect(a).toHaveLength(5);
    expect(a.every((x) => x.from === "deck" && x.to === "hand" && x.opening)).toBe(true);
    expect(a.map((x) => x.batch)).toEqual([0, 1, 2, 3, 4]);
  });

  it("a mulligan redraw is a draw like any other (it stops in the showcase)", () => {
    const r0 = start("the-gathering", ["01001"], 1);
    const r1 = pick(r0, r0.state.invs["01001"].hand[0]);
    const r2 = pick(r1, "done");
    expect(r2.state.phase).not.toBe("setup");
    const a = diffArrivals(r1.state, r2.state).filter((x) => x.to === "hand");
    expect(a).toHaveLength(1);
    expect(a[0].opening).toBe(false);
  });

  it("nothing moved, nothing arrives", () => {
    expect(diffArrivals(base.state, base.state)).toEqual([]);
  });
});

describe("recording", () => {
  const base = skipMulligans(start("the-gathering", ["01001"], 1));
  const fresh = (restored: boolean) => {
    const store = createStore<Pick<UiState, "game" | "setup" | "actions">>(() => ({
      game: null,
      setup: null,
      actions: [],
    }));
    trackArrivals(store as never);
    if (restored) quietNextGame();
    store.setState({ game: base.state, setup: {} as never });
    return store;
  };

  it("a draw is taken once, and expires after 1.5 s", () => {
    const store = fresh(true);
    const r = pick(base, /^Draw/);
    store.setState({ game: r.state });
    const id = diffArrivals(base.state, r.state)[0].id;
    expect(takeArrival(id)).toMatchObject({ from: "deck", to: "hand" });
    expect(takeArrival(id)).toBeNull();
    // an ordinary draw (seed 1's next card is the weakness Cover Up, which is shown and kept): the same draw, untaken, expires
    const again = fresh(true);
    again.setState({ game: r.state });
    expect(takeArrival(id, performance.now() + 2000)).toBeNull();
  });

  it("a card shown in the showcase keeps its arrival until it leaves there, however long the player reads", () => {
    const store = fresh(true);
    const r0 = mutate(base, (g) => {
      const cover = Object.values(g.s.cards).find((c) => c.code === "01007")!;
      const me = g.s.invs["01001"];
      for (const z of ["deck", "hand", "discard"] as const)
        me[z] = me[z].filter((x) => x !== cover.id);
      me.deck.unshift(cover.id);
      cover.zone = "deck";
    });
    store.setState({ game: r0.state });
    const r = pick(r0, /^Draw/);
    store.setState({ game: r.state });
    const id = Object.values(r.state.cards).find((c) => c.code === "01007")!.id;
    expect(takeArrival(id, performance.now() + 30_000)).toMatchObject({
      to: "threat",
      shown: true,
    });
  });

  it("a restored game records nothing; a new scenario records its opening hand", () => {
    fresh(true);
    for (const id of base.state.invs["01001"].hand) expect(takeArrival(id)).toBeNull();
    fresh(false);
    for (const id of base.state.invs["01001"].hand)
      expect(takeArrival(id)).toMatchObject({ from: "deck", to: "hand" });
  });
});

describe("originRect", () => {
  const box = (n: number) => ({ x: n, y: n, w: 10, h: 14 });
  const places: Record<Place, number> = {
    deck: 1,
    discard: 2,
    encounter: 3,
    encounterDiscard: 4,
    resolve: 5,
    actAgenda: 6,
    piles: 7,
    fan: 8,
    strip: 9,
    skilltest: 10,
    showcase: 11,
  };
  const find = (p: Place) => box(places[p]);
  const none = () => null;
  const arr = (o: Partial<Arrival>): Arrival => ({
    id: "c1",
    from: "deck",
    to: "hand",
    owner: "01001",
    opening: false,
    batch: 0,
    log: 0,
    shown: false,
    ...o,
  });
  const at = (o: Partial<Arrival>, last: (id: string) => ReturnType<typeof box> | null = none) =>
    originRect(arr(o), "01001", find, last, 1600, 900).x;

  it("own deck and discard; another investigator's cards come from the pile column", () => {
    expect(at({})).toBe(1);
    expect(at({ from: "discard" })).toBe(2);
    expect(at({ owner: "01002" })).toBe(7);
  });
  it("encounter pile, the showcase when the card was just shown there, the resolve spot when it was resolving", () => {
    expect(at({ from: "encounterDeck", to: "enemy", owner: null })).toBe(3);
    expect(at({ from: "encounterDeck", to: "enemy", owner: null, shown: true })).toBe(11);
    expect(at({ from: "resolving", to: "threat" })).toBe(5);
  });
  it("a shown card leaves from where the showcase last drew it, when known", () => {
    const shownAt = (id: string) => (id === "c1" ? box(42) : null);
    expect(at({ from: "encounterDeck", to: "enemy", owner: null, shown: true }, shownAt)).toBe(42);
    expect(at({ from: "deck", to: "threat", shown: true }, shownAt)).toBe(42);
  });
  it("hand and strip cards fly from where they last were, else the fan or strip", () => {
    expect(at({ from: "hand", to: "play" }, () => box(42))).toBe(42);
    expect(at({ from: "hand", to: "play" })).toBe(8);
    expect(at({ from: "play", to: "hand" })).toBe(9);
  });
  it("a committed card taken back flies from its spot in the skill-test panel", () => {
    expect(at({ from: "commit", to: "hand" }, () => box(43))).toBe(43);
    expect(at({ from: "commit", to: "hand" })).toBe(10);
  });
  it("locations from the act/agenda panel; anything else from a small box mid-screen", () => {
    expect(at({ from: "setAside", to: "location", owner: null })).toBe(6);
    expect(originRect(arr({ from: "limbo", to: "play" }), "01001", find, none, 1600, 900)).toEqual({
      x: 760,
      y: 394,
      w: 80,
      h: 112,
    });
  });
});

describe("settling before the chaos draw", () => {
  it("waits for 400 ms of quiet after the last flight, but never more than 4 s in all", () => {
    expect(isSettled(1000, 1000, 1000)).toBe(false);
    expect(isSettled(1399, 1000, 1000)).toBe(false);
    expect(isSettled(1400, 1000, 1000)).toBe(true);
    // something flew at 2500: wait until 2900
    expect(isSettled(2800, 1000, 2500)).toBe(false);
    expect(isSettled(2900, 1000, 2500)).toBe(true);
    // still flying at 5000: the cap lets the draw start
    expect(isSettled(5000, 1000, 5000)).toBe(true);
  });
});

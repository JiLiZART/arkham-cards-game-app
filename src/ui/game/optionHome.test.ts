import { describe, expect, it } from "vitest";
import { botChoice } from "../../engine/bot";
import { dispatch } from "../../engine/engine";
import { db, skipMulligans, start } from "../../engine/testkit";
import { layout } from "./layout";
import { onRail, optionHome, optionOwner } from "./optionHome";
import { viewerOf } from "../state/store";

describe("every pending option is reachable without a sidebar", () => {
  for (const scenario of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
    it(`bot playthrough of ${scenario}`, () => {
      let r = skipMulligans(start(scenario, ["01001", "01002", "01004"], 5));
      const problems: string[] = [];
      const seen = new Set<string>();
      for (let step = 0; step < 1500 && r.state.pending; step++) {
        const s = r.state;
        const viewer = viewerOf(s);
        const L = layout(db, s, viewer);
        for (const o of s.pending!.options) {
          const home = optionHome(o, s, viewer);
          seen.add(home);
          const c = o.card ? s.cards[o.card] : null;
          const ok =
            home === "rail" || home === "bar"
              ? !o.card
              : home === "hand"
                ? !!viewer && s.invs[viewer].hand.includes(o.card!)
                : // "board": on the map, or the viewer's play area strip (assets, threat area, engaged enemies)
                  home === "board"
                  ? L.cards.has(o.card!) ||
                    (!!c &&
                      !!viewer &&
                      (((c.zone === "play" || c.zone === "threat") && c.controller === viewer) ||
                        (c.zone === "enemy" && c.engagedWith === viewer)))
                  : home === "strip"
                    ? !!c &&
                      (o.card === s.act ||
                        o.card === s.agenda ||
                        ["victory", "encounterDiscard", "encounterDeck", "sideDeck"].includes(
                          c.zone,
                        ))
                    : home === "skilltest"
                      ? c?.zone === "commit" && !!s.skillTest?.committed.includes(o.card!)
                      : // a deck or discard search: its cards (and "take nothing") are shown large in the showcase
                        home === "showcase"
                        ? !o.card || ["deck", "discard"].includes(c?.zone ?? "")
                        : home === "avatar"
                          ? s.order.some((i) => s.invs[i].cardId === o.card)
                          : /* invModal */ (() => {
                              const w = optionOwner(o, s);
                              return !!w && w !== viewer && !!s.invs[w];
                            })();
          if (!ok)
            problems.push(`${s.pending!.kind}: "${o.label}" → ${home} (${c?.zone ?? "no card"})`);
        }
        const next = dispatch(db, s, {
          type: "choose",
          inv: s.pending!.inv,
          option: botChoice(db, r),
        });
        if (next.error) throw new Error(next.error);
        r = next;
      }
      expect([...new Set(problems)]).toEqual([]);
      expect(seen.has("board") && seen.has("hand") && seen.has("rail") && seen.has("bar")).toBe(
        true,
      );
    });
  }
});

describe("mulligan options", () => {
  it('picks are offered in the hand, take-backs on the "to redraw" row', () => {
    let r = start("the-gathering", ["01001"], 5);
    const h = r.state.invs["01001"].hand[0];
    r = dispatch(db, r.state, { type: "choose", inv: "01001", option: h });
    const homes = Object.fromEntries(
      r.state.pending!.options.map((o) => [o.id, optionHome(o, r.state, "01001")]),
    );
    expect(homes[`un:${h}`]).toBe("mulligan");
    expect(homes.done).toBe("bar");
    expect(
      Object.entries(homes)
        .filter(([id]) => id !== "done" && !id.startsWith("un:"))
        .every(([, home]) => home === "hand"),
    ).toBe(true);
  });
});

describe("phase pause", () => {
  it("Continue lives on the phase title", () => {
    const r = skipMulligans(start("the-gathering", ["01001", "01002"], 5, { pacePhases: true }));
    expect(r.state.pending!.kind).toBe("phase");
    expect(optionHome(r.state.pending!.options[0], r.state, "01002")).toBe("phase");
  });
});

describe("the bar and the rail", () => {
  it("Done, Pass and End turn answer in the bar; Draw, Resource and Investigate stay on the rail", () => {
    const r = skipMulligans(start("the-gathering", ["01001"], 5));
    const home = (label: RegExp) => {
      const o = r.state.pending!.options.find((o) => label.test(o.label))!;
      return onRail(o, r.state, "01001") ? "rail" : optionHome(o, r.state, "01001");
    };
    expect([/^End turn/, /^Draw/, /^Gain 1 resource/, /^Investigate/].map(home)).toEqual([
      "bar",
      "rail",
      "rail",
      "rail",
    ]);
    const done = { id: "done", label: "Done", value: "done" };
    const pass = { id: "pass", label: "Pass", value: "pass" };
    expect([done, pass].map((o) => optionHome(o, r.state, "01001"))).toEqual(["bar", "bar"]);
  });
});

describe("investigate on the rail", () => {
  it("beside Draw and Gain resource, and still on the location", () => {
    const r = skipMulligans(start("the-gathering", ["01001"], 5));
    const rail = r.state
      .pending!.options.filter((o) => onRail(o, r.state, "01001"))
      .map((o) => o.label);
    expect(rail).toEqual(
      expect.arrayContaining(["Investigate Study", "Draw 1 card", "Gain 1 resource"]),
    );
    const inv = r.state.pending!.options.find((o) => /^Investigate/.test(o.label))!;
    expect(optionHome(inv, r.state, "01001")).toBe("board");
  });
});

describe("the phone's instruction bar", () => {
  it("holds the bar's own options, the rail's (Draw, Resource, Investigate) and the act and agenda's, which sit in a closed drawer", async () => {
    const { inBar } = await import("./optionHome");
    const { mutate, pick } = await import("../../engine/testkit");
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    if (r.state.pending?.kind === "phase") r = pick(r, "continue");
    const s = r.state;
    const v = viewerOf(s);
    const labels = (mode: "phone" | "desktop") =>
      s.pending!.options.filter((o) => inBar(o, s, v, mode)).map((o) => o.label);
    expect(labels("desktop")).toEqual(expect.arrayContaining(["End turn"]));
    expect(labels("desktop").some((l) => /^Draw/.test(l))).toBe(false);
    expect(labels("phone")).toEqual(expect.arrayContaining(["End turn"]));
    expect(labels("phone").some((l) => /^Draw/.test(l))).toBe(true);
    expect(labels("phone").some((l) => /^Gain/.test(l))).toBe(true);
    expect(labels("phone").some((l) => /^Investigate/.test(l))).toBe(true);
    // hand cards stay in the hand drawer, not the bar
    expect(
      s
        .pending!.options.filter((o) => o.card && s.cards[o.card].zone === "hand")
        .every((o) => !inBar(o, s, v, "phone")),
    ).toBe(true);
    // with clues enough, the act's Advance is in the phone's bar (the act sits in the closed left drawer)
    const r2 = mutate(r, (g) => (g.s.invs["01001"].clues = 9));
    const s2 = r2.state;
    const adv = s2.pending!.options.find((o) => o.card === s2.act);
    expect(adv).toBeTruthy();
    expect(inBar(adv!, s2, v, "phone")).toBe(true);
    expect(inBar(adv!, s2, v, "desktop")).toBe(false);
  });
});
